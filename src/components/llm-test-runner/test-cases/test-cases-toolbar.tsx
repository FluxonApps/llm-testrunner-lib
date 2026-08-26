import { h, FunctionalComponent } from '@stencil/core';
import { IconButton } from '../../../lib/ui/icon-button/index';
import {
  PlusIcon,
  UploadIcon,
  DownloadIcon,
  SearchIcon,
} from '../../../lib/ui/icons/icons';
import type { StatusFilter } from './test-case-filtering';

export interface TestCasesToolbarProps {
  totalCount: number;
  notTestedCount: number;
  failedCount: number;
  passedCount: number;
  activeFilter: StatusFilter;
  isExportingTestSuite: boolean;
  searchQuery: string;
  isSearchExpanded: boolean;
  onAddTestCase: () => void;
  onImport: (file: File) => void;
  onExportSuite: () => void;
  onFilterChange: (filter: StatusFilter) => void;
  onSearchQueryChange: (query: string) => void;
  onSearchExpandedChange: (expanded: boolean) => void;
}

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'not-tested', label: 'Not Tested' },
  { value: 'failed', label: 'Failed' },
  { value: 'passed', label: 'Passed' },
];

export const TestCasesToolbar: FunctionalComponent<TestCasesToolbarProps> = ({
  totalCount,
  notTestedCount,
  failedCount,
  passedCount,
  activeFilter,
  isExportingTestSuite,
  searchQuery,
  isSearchExpanded,
  onAddTestCase,
  onImport,
  onExportSuite,
  onFilterChange,
  onSearchQueryChange,
  onSearchExpandedChange,
}) => {
  const countFor = (filter: StatusFilter): number | null => {
    switch (filter) {
      case 'all':
        return null;
      case 'not-tested':
        return notTestedCount;
      case 'failed':
        return failedCount;
      case 'passed':
        return passedCount;
    }
  };

  let fileInputRef: HTMLInputElement;

  const handleFileSelect = () => {
    fileInputRef?.click();
  };

  const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = ''; // Clear for re-upload
    if (file) {
      onImport(file);
    }
  };

  const noun = totalCount === 1 ? 'Question' : 'Questions';

  return (
    <div class="test-cases-toolbar">
      <div class="test-cases-toolbar__left">
        <span class="test-cases-toolbar__count">
          {totalCount} {noun}
        </span>
        <div class="test-cases-toolbar__actions">
          <input
            class="test-cases-toolbar__file-input"
            type="file"
            ref={el => (fileInputRef = el as HTMLInputElement)}
            onChange={handleFileChange}
            accept=".json,application/json"
          />
          <IconButton
            variant="outline"
            class="test-cases-toolbar__icon-btn"
            onClick={onAddTestCase}
            title="Add question"
          >
            <PlusIcon />
          </IconButton>
          <IconButton
            variant="outline"
            class="test-cases-toolbar__icon-btn"
            onClick={handleFileSelect}
            title="Import test suite"
          >
            <UploadIcon />
          </IconButton>
          <IconButton
            variant="outline"
            class="test-cases-toolbar__icon-btn"
            onClick={onExportSuite}
            loading={isExportingTestSuite}
            title="Export test suite"
          >
            <DownloadIcon />
          </IconButton>
        </div>
        <div class="test-cases-toolbar__filters">
          {FILTERS.map(filter => {
            const count = countFor(filter.value);
            const isActive = activeFilter === filter.value;
            return (
              <button
                type="button"
                class={{
                  'test-cases-toolbar__filter-pill': true,
                  'test-cases-toolbar__filter-pill--active': isActive,
                }}
                aria-pressed={isActive}
                onClick={() => onFilterChange(filter.value)}
                key={filter.value}
              >
                {filter.label}
                {count !== null ? ` ${count}` : ''}
              </button>
            );
          })}
        </div>
      </div>
      <div class="test-cases-toolbar__search">
        {isSearchExpanded ? (
          <input
            type="text"
            class="test-cases-toolbar__search-input"
            placeholder="Search questions…"
            value={searchQuery}
            ref={el => el?.focus()}
            onInput={e =>
              onSearchQueryChange((e.target as HTMLInputElement).value)
            }
            onBlur={e => {
              // Read the live DOM value rather than the searchQuery prop —
              // Stencil's re-render after onInput is async, so a fast
              // clear-then-blur can fire before this closure's prop
              // updates, which would otherwise leave the input stuck open.
              if (!(e.target as HTMLInputElement).value.trim()) {
                onSearchExpandedChange(false);
              }
            }}
          />
        ) : (
          <IconButton
            variant="outline"
            class="test-cases-toolbar__icon-btn"
            onClick={() => onSearchExpandedChange(true)}
            title="Search questions"
          >
            <SearchIcon />
          </IconButton>
        )}
      </div>
    </div>
  );
};
