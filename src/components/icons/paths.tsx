import type { ReactNode } from 'react';

/**
 * Original line icons on a 24x24 grid. Strokes use currentColor; shapes with
 * className="i-accent" take the gold --icon-accent. No external references, no
 * brand artwork: every shape here is drawn from basic geometry.
 */
export const ICON_PATHS = {
  // --- Property groups ---------------------------------------------------------
  'group-bazaars': (
    <>
      <path d="M3 9l1.6-4.5h14.8L21 9" />
      <path d="M3 9a2.25 2.25 0 0 0 4.5 0 2.25 2.25 0 0 0 4.5 0 2.25 2.25 0 0 0 4.5 0 2.25 2.25 0 0 0 4.5 0" />
      <path d="M5 11.8V20h14v-8.2" />
      <path d="M9.5 20v-4.5h5V20" className="i-accent" />
    </>
  ),
  'group-retail': (
    <>
      <path d="M3 10h18l-1.7 8.6A1.8 1.8 0 0 1 17.5 20h-11a1.8 1.8 0 0 1-1.8-1.4z" />
      <path d="M8 10l3-5.5M16 10l-3-5.5" />
      <path d="M9 13.5v3M12 13.5v3M15 13.5v3" className="i-accent" />
    </>
  ),
  'group-telecom': (
    <>
      <circle cx="12" cy="8" r="1.6" className="i-accent" />
      <path d="M8.8 4.8a4.6 4.6 0 0 0 0 6.4M15.2 4.8a4.6 4.6 0 0 1 0 6.4" />
      <path d="M6.2 2.6a8.2 8.2 0 0 0 0 10.8M17.8 2.6a8.2 8.2 0 0 1 0 10.8" />
      <path d="M12 9.8L9 21M12 9.8L15 21M10.2 17h3.6" />
    </>
  ),
  'group-fintech': (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.6" />
      <path d="M10.5 5.5h3" />
      <circle cx="12" cy="13" r="3.6" />
      <path d="M10.3 13.1l1.2 1.2 2.3-2.5" className="i-accent" />
    </>
  ),
  'group-banking': (
    <>
      <path d="M3 9.5L12 4l9 5.5z" />
      <path d="M5.5 11.5v6M9.8 11.5v6M14.2 11.5v6M18.5 11.5v6" />
      <path d="M3.5 20h17" className="i-accent" />
    </>
  ),
  'group-construction': (
    <>
      <path d="M7 21V3.5M3 6.5h17.5" />
      <path d="M7 3.5l-4 3M7 3.5l7.5 3" />
      <path d="M16.5 6.5v6.2" />
      <rect x="14" y="12.7" width="5" height="3.3" rx="0.6" className="i-accent" />
      <path d="M4 21h6.5" />
    </>
  ),
  'group-mining': (
    <>
      <path d="M6.2 4h11.6L22 9.2 12 20.5 2 9.2z" />
      <path d="M2 9.2h20M9.4 4L8 9.2l4 11.3 4-11.3L14.6 4" className="i-accent" />
    </>
  ),
  'group-capital': (
    <>
      <path d="M4 21V10.5h5V21M9 21V3.5h6V21M15 21V8h5v13M2.5 21h19" />
      <path d="M11.2 7.5h1.6M11.2 11.5h1.6M11.2 15.5h1.6" className="i-accent" />
    </>
  ),

  // --- Transport assets -------------------------------------------------------------
  'infra-railways': (
    <>
      <rect x="6" y="2.8" width="12" height="14" rx="3.2" />
      <path d="M6 9.8h12" />
      <circle cx="9.6" cy="13.6" r="0.9" className="i-accent" />
      <circle cx="14.4" cy="13.6" r="0.9" className="i-accent" />
      <path d="M8.4 21l1.8-3.7M15.6 21l-1.8-3.7M7 21h10" />
    </>
  ),
  'infra-airways': (
    <>
      <path d="M21.5 2.5L2.5 10l7 3 3 7.5z" />
      <path d="M9.5 13L21.5 2.5" className="i-accent" />
    </>
  ),
  'infra-qanot-sharq': (
    <>
      <path d="M3.5 20.5c.6-7 5-13.6 17-16-1 4.6-3.4 8.4-7.6 10.4 .8-2.8 1-4.4 1.8-6.4-3.4 2-6 5.2-7.2 9.6z" />
      <path d="M3.5 20.5L11 12" className="i-accent" />
    </>
  ),
  'infra-metro': (
    <>
      <path d="M3.5 20.5V11a8.5 8.5 0 0 1 17 0v9.5M2.5 20.5h19" />
      <path d="M8 20.5v-7a4 4 0 0 1 8 0v7z" />
      <path d="M10 13.4h4" />
      <circle cx="10.1" cy="17.3" r="0.8" className="i-accent" />
      <circle cx="13.9" cy="17.3" r="0.8" className="i-accent" />
    </>
  ),

  // --- Utilities ---------------------------------------------------------------------
  'utility-oil-gas': (
    <>
      <path d="M12 2.8c3.2 3.6 5.8 6.2 5.8 9.8a5.8 5.8 0 0 1-11.6 0C6.2 9 8.8 6.8 12 2.8z" />
      <path d="M12 20a2.9 2.9 0 0 1-2.9-2.9c0-1.7 1.3-2.8 2.9-4.6 1.6 1.8 2.9 2.9 2.9 4.6A2.9 2.9 0 0 1 12 20z" className="i-accent" />
    </>
  ),
  'utility-power': (
    <>
      <path d="M13.6 2.5L5 13.4h6l-1 8.1 8.6-11h-6z" />
      <path d="M13.6 2.5L9 8.3" className="i-accent" />
    </>
  ),

  // --- Network, cards, special cells ---------------------------------------------------
  'network-stop': (
    <>
      <circle cx="12" cy="12" r="3.2" className="i-accent" />
      <circle cx="12" cy="12" r="7.6" />
      <path d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3" />
    </>
  ),
  'card-mahalla': (
    <>
      <path d="M3 11.2L12 4l9 7.2M5.5 9.6V20h13V9.6" />
      <path d="M10 20v-4a2 2 0 0 1 4 0v4" />
      <path d="M12 7.6l.7 1.4 1.5.2-1.1 1.1.3 1.5-1.4-.8-1.4.8.3-1.5-1.1-1.1 1.5-.2z" className="i-accent" />
    </>
  ),
  'card-business': (
    <>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.2" />
      <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3 13h18" />
      <rect x="10.3" y="11.8" width="3.4" height="2.8" rx="0.6" className="i-accent" />
    </>
  ),
  corruption: (
    <>
      <rect x="2.8" y="5.5" width="18.4" height="13" rx="2.2" />
      <path d="M3.4 7l8.6 6.2L20.6 7" />
      <circle cx="17.2" cy="16.6" r="3.4" className="i-accent" />
    </>
  ),
  'bribe-official': (
    <>
      <circle cx="12" cy="7.4" r="3.4" />
      <path d="M4.6 20.5c0-4.1 3-6.8 7.4-6.8s7.4 2.7 7.4 6.8z" />
      <path d="M12 14l-1.3 2.6L12 20l1.3-3.4z" className="i-accent" />
    </>
  ),
  detention: (
    <>
      <circle cx="10.4" cy="10.4" r="6.6" />
      <path d="M15.4 15.4L21.4 21.4" className="i-accent" />
      <path d="M7.6 9.6h5.6M7.6 12.2h3.4" />
    </>
  ),
  start: (
    <>
      <path d="M5.5 21.5V3" />
      <path d="M5.5 4h12.5l-2.8 4 2.8 4H5.5" className="i-accent" />
    </>
  ),
  rest: (
    <>
      <path d="M3.5 10.5h17a8.5 8.5 0 0 1-17 0z" />
      <path d="M8.5 21h7" />
      <path d="M9 3c-1.2 1.3 1.2 2.4 0 3.8M13 3c-1.2 1.3 1.2 2.4 0 3.8M17 4c-1 1 .9 1.8 0 3" className="i-accent" />
    </>
  ),
  tax: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.4 15.6l7.2-7.2" className="i-accent" />
      <circle cx="9" cy="9" r="1.2" />
      <circle cx="15" cy="15" r="1.2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.8" width="14" height="10" rx="2.2" />
      <path d="M8 10.8V8a4 4 0 0 1 8 0v2.8" />
      <path d="M12 14.6v2.6" className="i-accent" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICON_PATHS;
export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];
