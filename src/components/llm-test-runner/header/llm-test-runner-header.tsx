import { h, FunctionalComponent } from '@stencil/core';
import { Button } from '../../../lib/ui/button/index';
import {
  FileTextIcon,
  SaveIcon,
  SlidersIcon,
  PlayIcon,
  SpinnerIcon,
} from '../../../lib/ui/icons/icons';

export interface LLMTestRunnerHeaderProps {
  isExportingTestResults: boolean;
  isRunningAll: boolean;
  canRunAny: boolean;
  useSave?: boolean;
  isSaving?: boolean;
  usePromptEditor?: boolean;
  onExportResults: () => void;
  onRunAll: () => void;
  onSave?: () => void;
}

export const LLMTestRunnerHeader: FunctionalComponent<
  LLMTestRunnerHeaderProps
> = ({
  isExportingTestResults,
  isRunningAll,
  canRunAny,
  useSave = false,
  isSaving = false,
  usePromptEditor = false,
  onExportResults,
  onRunAll,
  onSave,
}) => {
  return (
    <header class="test-runner-header">
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
          disabled={isRunningAll || !canRunAny}
          loading={isRunningAll}
          icon={isRunningAll ? <SpinnerIcon /> : <PlayIcon />}
        >
          {isRunningAll ? 'Running…' : 'Run all'}
        </Button>
      </div>
    </header>
  );
};
