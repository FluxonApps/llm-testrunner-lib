import { h, FunctionalComponent } from '@stencil/core';
import { IconButton } from '../../../../lib/ui/icon-button/index';

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
        variant="outline"
        onClick={onRun}
        disabled={isRunning || !canRun}
        title={!canRun ? 'Enter a question first' : 'Run this test'}
      >
        {isRunning ? '⏳' : '▶️'}
      </IconButton>
      <IconButton variant="outline" onClick={onDelete} title="Delete this test">
        🗑️
      </IconButton>
    </div>
  );
};
