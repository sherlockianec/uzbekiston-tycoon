import type { CSSProperties } from 'react';
import { ICON_PATHS, type IconName } from './paths';

export interface IconProps {
  name: IconName;
  /** Pixel size (square). Defaults to 1em so icons scale with surrounding text. */
  size?: number | string;
  /** Accessible name. Omit for purely decorative icons (the default). */
  title?: string;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}

/** Line icon drawn in currentColor, with a gold accent via --icon-accent. */
export default function Icon({ name, size = '1em', title, className = '', style, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon icon--${name} ${className}`.trim()}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {ICON_PATHS[name]}
    </svg>
  );
}
