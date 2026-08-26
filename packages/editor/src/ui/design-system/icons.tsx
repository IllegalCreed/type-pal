import type { SVGProps } from 'react'

export type DsIconName =
  | 'add'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'chevron-up'
  | 'close'
  | 'copy'
  | 'delete'
  | 'edit'
  | 'eye'
  | 'eye-off'
  | 'grip'
  | 'lock'
  | 'unlock'
  | 'more'
  | 'open'
  | 'pause'
  | 'play'
  | 'panel-bottom'
  | 'panel-left'
  | 'panel-right'
  | 'redo'
  | 'save'
  | 'skip-back'
  | 'skip-forward'
  | 'stop'
  | 'undo'
  | 'upload'
  | 'zoom-in'
  | 'zoom-out'

const PATHS: Record<DsIconName, React.ReactNode> = {
  add: (
    <>
      <path d="M8 3v10" />
      <path d="M3 8h10" />
    </>
  ),
  check: <path d="m4 9 3 3 7-8" />,
  'chevron-left': <path d="m10 4-4 4 4 4" />,
  'chevron-right': <path d="m6 4 4 4-4 4" />,
  'chevron-down': <path d="m4 6 4 4 4-4" />,
  'chevron-up': <path d="m4 10 4-4 4 4" />,
  close: (
    <>
      <path d="M4 4l8 8" />
      <path d="m12 4-8 8" />
    </>
  ),
  copy: (
    <>
      <rect x="5" y="5" width="8" height="8" rx="1" />
      <path d="M3 11H2V2h9v1" />
    </>
  ),
  delete: (
    <>
      <path d="M3 4h10" />
      <path d="m6 2h4l1 2H5l1-2Z" />
      <path d="m5 6 .5 7h5L11 6" />
    </>
  ),
  edit: (
    <>
      <path d="m10.5 2.5 3 3L6 13H3v-3l7.5-7.5Z" />
      <path d="m9 4 3 3" />
    </>
  ),
  eye: (
    <>
      <path d="M1.5 8s2.3-4 6.5-4 6.5 4 6.5 4-2.3 4-6.5 4S1.5 8 1.5 8Z" />
      <circle cx="8" cy="8" r="2" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M3.2 4.2C2.1 5.1 1.5 6.1 1.5 6.1S3.8 10 8 10c1 0 1.9-.2 2.7-.6" />
      <path d="M5.2 3.5C6 3.2 6.9 3 8 3c4.2 0 6.5 3.9 6.5 3.9s-.5.9-1.5 1.8" />
      <path d="m2 2 12 12" />
    </>
  ),
  grip: (
    <>
      <circle cx="5" cy="4" r="1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="4" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" />
    </>
  ),
  unlock: (
    <>
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 0 1 5.6-1.5" />
    </>
  ),
  more: (
    <>
      <circle cx="3" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="13" cy="8" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  open: (
    <>
      <path d="M5 3h8v8" />
      <path d="m13 3-8 8" />
      <path d="M11 9v4H3V5h4" />
    </>
  ),
  pause: (
    <>
      <path d="M5 3v10" />
      <path d="M11 3v10" />
    </>
  ),
  play: <path d="m5 3 8 5-8 5V3Z" />,
  'panel-bottom': (
    <>
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M2 10h12" />
    </>
  ),
  'panel-left': (
    <>
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M6 2v12" />
    </>
  ),
  'panel-right': (
    <>
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M10 2v12" />
    </>
  ),
  redo: (
    <>
      <path d="M12 5h3v-3" />
      <path d="M14.5 5A6 6 0 1 0 14 11" />
    </>
  ),
  save: (
    <>
      <path d="M3 2h8l2 2v9H3V2Z" />
      <path d="M5 2v4h6V3" />
      <path d="M5 13V9h6v4" />
    </>
  ),
  'skip-back': (
    <>
      <path d="M4 3v10" />
      <path d="m12 3-7 5 7 5V3Z" />
    </>
  ),
  'skip-forward': (
    <>
      <path d="M12 3v10" />
      <path d="m4 3 7 5-7 5V3Z" />
    </>
  ),
  stop: <rect x="4" y="4" width="8" height="8" rx="1" />,
  undo: (
    <>
      <path d="M4 5H1v-3" />
      <path d="M1.5 5A6 6 0 1 1 2 11" />
    </>
  ),
  upload: (
    <>
      <path d="M8 11V3" />
      <path d="m4.5 6.5 3.5-3.5 3.5 3.5" />
      <path d="M3 10v3h10v-3" />
    </>
  ),
  'zoom-in': (
    <>
      <circle cx="7" cy="7" r="4" />
      <path d="m10 10 4 4M7 5v4M5 7h4" />
    </>
  ),
  'zoom-out': (
    <>
      <circle cx="7" cy="7" r="4" />
      <path d="m10 10 4 4M5 7h4" />
    </>
  ),
}

export function DsIcon(props: SVGProps<SVGSVGElement> & { name: DsIconName }) {
  const { name, ...svgProps } = props
  return (
    <svg
      {...svgProps}
      className={`ds-icon${svgProps.className ? ` ${svgProps.className}` : ''}`}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
