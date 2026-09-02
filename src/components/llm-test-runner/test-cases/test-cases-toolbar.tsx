import { h, FunctionalComponent } from '@stencil/core';
import { Button } from '../../../lib/ui/button/index';
import { IconButton } from '../../../lib/ui/icon-button/index';
import { Tooltip } from '../../../lib/ui/tooltip';
import {
  PlusIcon,
  UploadIcon,
  DownloadIcon,
  SearchIcon,
  BarChart3Icon,
  PlayIcon,
  SaveIcon,
  SlidersIcon,
  SpinnerIcon,
} from '../../../lib/ui/icons/icons';
import type { StatusFilter } from './test-case-filtering';

export interface TestCasesToolbarProps {
  isStuck?: boolean;
  totalCount: number;
  notTestedCount: number;
  failedCount: number;
  passedCount: number;
  activeFilter: StatusFilter;
  isExportingTestSuite: boolean;
  isExportingTestResults: boolean;
  isRunningAll: boolean;
  canRunAny: boolean;
  useSave?: boolean;
  isSaving?: boolean;
  usePromptEditor?: boolean;
  searchQuery: string;
  isSearchExpanded: boolean;
  onAddTestCase: () => void;
  onImport: (file: File) => void;
  onExportSuite: () => void;
  onExportResults: () => void;
  onRunAll: () => void;
  onSave?: () => void;
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
  isStuck = false,
  totalCount,
  notTestedCount,
  failedCount,
  passedCount,
  activeFilter,
  isExportingTestSuite,
  isExportingTestResults,
  isRunningAll,
  canRunAny,
  useSave = false,
  isSaving = false,
  usePromptEditor = false,
  searchQuery,
  isSearchExpanded,
  onAddTestCase,
  onImport,
  onExportSuite,
  onExportResults,
  onRunAll,
  onSave,
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
    <div
      class={{
        'test-cases-toolbar': true,
        'test-cases-toolbar--stuck': isStuck,
      }}
    >
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
          <Tooltip content="Add question">
            <IconButton
              variant="outline"
              class="test-cases-toolbar__icon-btn"
              onClick={onAddTestCase}
            >
              <PlusIcon />
            </IconButton>
          </Tooltip>
          <Tooltip content="Import test suite">
            <IconButton
              variant="outline"
              class="test-cases-toolbar__icon-btn"
              onClick={handleFileSelect}
            >
              <UploadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip content="Export test suite">
            <IconButton
              variant="outline"
              class="test-cases-toolbar__icon-btn"
              onClick={onExportSuite}
              loading={isExportingTestSuite}
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
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
      <div class="test-cases-toolbar__right">
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
                // Read the live DOM value, not the searchQuery prop — Stencil's async
                // re-render can lag a fast clear-then-blur, leaving the input stuck open.
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
        {usePromptEditor && (
          <Tooltip content="Prompt editor">
            <IconButton variant="outline" class="test-cases-toolbar__icon-btn">
              <SlidersIcon />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip content="Create report">
          <IconButton
            variant="outline"
            class="test-cases-toolbar__icon-btn"
            onClick={onExportResults}
            loading={isExportingTestResults}
          >
            <BarChart3Icon />
          </IconButton>
        </Tooltip>
        {useSave && (
          <Tooltip content="Save">
            <IconButton
              variant="outline"
              class="test-cases-toolbar__icon-btn"
              onClick={onSave}
              loading={isSaving}
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
        )}
        <Button
          aria-label="Run all"
          variant="primary"
          size="md"
          onClick={onRunAll}
          disabled={isRunningAll || !canRunAny}
          loading={isRunningAll}
          icon={isRunningAll ? <SpinnerIcon /> : <PlayIcon />}
        >
          {isRunningAll ? 'Running…' : 'Run all'}
        </Button>
      </div>
    </div>
  );
};
