import { h, FunctionalComponent } from '@stencil/core';

/**
 * Lucide-style icon set.
 *
 * 24×24 viewBox, 2px stroke, rounded line caps & joins, currentColor stroke
 * — the same visual rhythm as Linear / Vercel / GitHub. Display size is
 * controlled by the parent (typically 14–16px via the button styles).
 *
 * Each icon is a Functional Component that takes no props beyond an
 * optional class for layout/animation hooks.
 */

interface IconProps {
  class?: string;
}

const baseProps = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': 'true',
} as const;

/** Up-arrow into a tray — used for Import. */
export const UploadIcon: FunctionalComponent<IconProps> = ({ class: cls }) => (
  <svg {...baseProps} class={cls}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

/** Down-arrow out of a tray — used for Export Suite. */
export const DownloadIcon: FunctionalComponent<IconProps> = ({
  class: cls,
}) => (
  <svg {...baseProps} class={cls}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

/** Document with text lines — used for Export Test Results. */
export const FileTextIcon: FunctionalComponent<IconProps> = ({
  class: cls,
}) => (
  <svg {...baseProps} class={cls}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

/** Floppy / save icon — used for Save. */
export const SaveIcon: FunctionalComponent<IconProps> = ({ class: cls }) => (
  <svg {...baseProps} class={cls}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

/** Sliders — used for Prompt Editor (cleaner than a gear, less "settings"). */
export const SlidersIcon: FunctionalComponent<IconProps> = ({
  class: cls,
}) => (
  <svg {...baseProps} class={cls}>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

/** Filled play triangle — used for Run / Run All. */
export const PlayIcon: FunctionalComponent<IconProps> = ({ class: cls }) => (
  <svg {...baseProps} class={cls} fill="currentColor" stroke="none">
    <polygon points="6 4 20 12 6 20 6 4" />
  </svg>
);

/** Trash can — used for Delete row. */
export const TrashIcon: FunctionalComponent<IconProps> = ({ class: cls }) => (
  <svg {...baseProps} class={cls}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
);

/** Plus — used for Add Question / Add Test Case. */
export const PlusIcon: FunctionalComponent<IconProps> = ({ class: cls }) => (
  <svg {...baseProps} class={cls}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/** Spinner — partial circular arc that rotates. Used for loading states.
 * The rotation animation is in `icons.css`. */
export const SpinnerIcon: FunctionalComponent<IconProps> = ({
  class: cls,
}) => (
  <svg
    {...baseProps}
    class={['icon-spinner', cls].filter(Boolean).join(' ')}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

/** Speech-bubble — used for Chat history. */
export const MessageSquareIcon: FunctionalComponent<IconProps> = ({
  class: cls,
}) => (
  <svg {...baseProps} class={cls}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

/** X / close — used to remove an optional section. */
export const XIcon: FunctionalComponent<IconProps> = ({ class: cls }) => (
  <svg {...baseProps} class={cls}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
