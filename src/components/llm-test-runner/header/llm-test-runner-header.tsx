import { h, FunctionalComponent } from '@stencil/core';
import { Button } from '../../../lib/ui/button/index';
import {
  UploadIcon,
  DownloadIcon,
  FileTextIcon,
  SaveIcon,
  SlidersIcon,
  PlayIcon,
  SpinnerIcon,
} from '../../../lib/ui/icons/icons';

export interface LLMTestRunnerHeaderProps {
  isExportingTestSuite: boolean;
  isExportingTestResults: boolean;
  isRunningAll: boolean;
  useSave?: boolean;
  isSaving?: boolean;
  usePromptEditor?: boolean;
  onImport: (file: File) => void;
  onExportSuite: () => void;
  onExportResults: () => void;
  onRunAll: () => void;
  onSave?: () => void;
}

export const LLMTestRunnerHeader: FunctionalComponent<
  LLMTestRunnerHeaderProps
> = ({
  isExportingTestSuite,
  isExportingTestResults,
  isRunningAll,
  useSave = false,
  isSaving = false,
  usePromptEditor = false,
  onImport,
  onExportSuite,
  onExportResults,
  onRunAll,
  onSave,
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

  return (
    <header class="test-runner-header">
      <div class="test-runner-header__left">
        <input
          class="test-runner-header--hidden"
          type="file"
          ref={el => (fileInputRef = el as HTMLInputElement)}
          onChange={handleFileChange}
          accept=".json,application/json"
        />
        <Button
          variant="outline"
          size="md"
          onClick={handleFileSelect}
          icon={<UploadIcon />}
        >
          Import suite
        </Button>
        <Button
          variant="outline"
          size="md"
          onClick={onExportSuite}
          disabled={isExportingTestSuite}
          loading={isExportingTestSuite}
          icon={isExportingTestSuite ? <SpinnerIcon /> : <DownloadIcon />}
        >
          {isExportingTestSuite ? 'Exporting…' : 'Export suite'}
        </Button>
      </div>

      <div class="test-runner-header__right">
        {usePromptEditor && (
          <Button variant="outline" size="md" icon={<SlidersIcon />}>
            Prompt editor
          </Button>
        )}
        <Button
          variant="outline"
          size="md"
          onClick={onExportResults}
          disabled={isExportingTestResults}
          loading={isExportingTestResults}
          icon={isExportingTestResults ? <SpinnerIcon /> : <FileTextIcon />}
        >
          {isExportingTestResults ? 'Exporting…' : 'Export results'}
        </Button>
        {useSave && (
          <Button
            variant="outline"
            size="md"
            onClick={onSave}
            disabled={isSaving}
            loading={isSaving}
            icon={isSaving ? <SpinnerIcon /> : <SaveIcon />}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        )}
        <Button
          aria-label="Run all"
          variant="primary"
          size="md"
          onClick={onRunAll}
          disabled={isRunningAll}
          loading={isRunningAll}
          icon={isRunningAll ? <SpinnerIcon /> : <PlayIcon />}
        >
          {isRunningAll ? 'Running…' : 'Run all'}
        </Button>
      </div>
    </header>
  );
};
