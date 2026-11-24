import type { ReactNode, SVGProps } from 'react';

function Glyph({ children, ...rest }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

type IconProps = SVGProps<SVGSVGElement>;

export const RidgeIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M2.5 18.5 9 7l3.6 6 2.4-3.5 6.5 9" />
    <path d="M7.2 10.2 9 11.6l1.6-1.8" />
  </Glyph>
);

export const SparkIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4" />
    <path d="M12 9.2 13.1 11l1.7 1-1.7 1L12 14.8 10.9 13l-1.7-1 1.7-1Z" />
  </Glyph>
);

export const ArrowIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Glyph>
);

export const ShuffleIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M3 7h3.5c2.2 0 3.4 1 4.6 3l1.8 4c1.2 2 2.4 3 4.6 3H21" />
    <path d="M3 17h3.5c1.3 0 2.2-.4 3-1.1M21 7h-3.5c-1.3 0-2.2.4-3 1.1" />
    <path d="m18.5 4.5 2.5 2.5-2.5 2.5M18.5 14.5 21 17l-2.5 2.5" />
  </Glyph>
);

export const OrbitIcon = (props: IconProps) => (
  <Glyph {...props}>
    <circle cx="12" cy="12" r="2.2" />
    <path d="M20.5 12c0 2.2-3.8 4-8.5 4s-8.5-1.8-8.5-4 3.8-4 8.5-4" />
    <path d="m17.5 5.5 3 2.5-3.4 1.6" />
  </Glyph>
);

export const ChevronIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="m6 9 6 6 6-6" />
  </Glyph>
);

export const LinkIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
    <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
  </Glyph>
);

export const CheckIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Glyph>
);
