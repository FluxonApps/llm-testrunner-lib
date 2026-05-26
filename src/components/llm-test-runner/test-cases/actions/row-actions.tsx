import { h, FunctionalComponent } from '@stencil/core';
import { IconButton } from '../../../../lib/ui/icon-button/index';
import {
  PlayIcon,
  SpinnerIcon,
  TrashIcon,
} from '../../../../lib/ui/icons/icons';

export interface RowActionsProps {
  isRunning: boolean;
  canRun: boolean;
  onRun: () => void;
  onDelete: () => void;
}

export const RowActions: FunctionalComponent<RowActionsProps> = ({
  isRunning,
  canRun,
  onRun,
  onDelete,
}) => {
  return (
    <div class="row-actions">
      <IconButton
        variant="primary"
        onClick={onRun}
        disabled={isRunning || !canRun}
        title={!canRun ? 'Enter a question first' : 'Run this test'}
      >
        {isRunning ? <SpinnerIcon /> : <PlayIcon />}
      </IconButton>
      <IconButton
        variant="outline"
        onClick={onDelete}
        title="Delete this test"
      >
        <TrashIcon />
      </IconButton>
    </div>
  );
};
