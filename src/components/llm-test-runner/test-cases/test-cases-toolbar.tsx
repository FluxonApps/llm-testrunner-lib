import { h, FunctionalComponent } from '@stencil/core';
import { IconButton } from '../../../lib/ui/icon-button/index';
import { PlusIcon, UploadIcon, DownloadIcon } from '../../../lib/ui/icons/icons';

export interface TestCasesToolbarProps {
  totalCount: number;
  isExportingTestSuite: boolean;
  onAddTestCase: () => void;
  onImport: (file: File) => void;
  onExportSuite: () => void;
}

export const TestCasesToolbar: FunctionalComponent<TestCasesToolbarProps> = ({
  totalCount,
  isExportingTestSuite,
  onAddTestCase,
  onImport,
  onExportSuite,
}) => {
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
            variant="secondary"
            class="test-cases-toolbar__icon-btn"
            onClick={onAddTestCase}
            title="Add question"
          >
            <PlusIcon />
          </IconButton>
          <IconButton
            variant="secondary"
            class="test-cases-toolbar__icon-btn"
            onClick={handleFileSelect}
            title="Import test suite"
          >
            <UploadIcon />
          </IconButton>
          <IconButton
            variant="secondary"
            class="test-cases-toolbar__icon-btn"
            onClick={onExportSuite}
            loading={isExportingTestSuite}
            title="Export test suite"
          >
            <DownloadIcon />
          </IconButton>
        </div>
      </div>
    </div>
  );
};
