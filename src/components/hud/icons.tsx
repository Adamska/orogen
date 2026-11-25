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

export const CycleIcon = (props: IconProps) => (
  <Glyph {...props}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
  </Glyph>
);

export const CameraIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.5" />
  </Glyph>
);

export const CloseIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Glyph>
);

export const FlightIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M3 13.5 21 6l-4.5 13-4-5.2z" />
    <path d="m12.5 13.8 4-7.8" />
  </Glyph>
);

export const BrushIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M19.5 4.5 11 13" />
    <path d="M11 13c-2.5-.5-5 1-5 4 0 1.5-1 2.5-2.5 2.5C5 21 8 21.5 10 20s2.5-4 1-7z" />
  </Glyph>
);

export const SoundIcon = (props: IconProps & { muted?: boolean }) => {
  const { muted = false, ...rest } = props;
  return (
    <Glyph {...rest}>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
      {muted ? <path d="m16 10 4 4m0-4-4 4" /> : <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />}
    </Glyph>
  );
};

export const WalkIcon = (props: IconProps) => (
  <Glyph {...props}>
    <circle cx="13.5" cy="4.5" r="1.8" />
    <path d="m9.5 21 2.4-6.4 2.8 2.4V21" />
    <path d="M11.9 14.6 12.8 8.6 9 10.8l-.8 3.2" />
    <path d="m12.8 8.6 2.3 3.1 3 .9" />
  </Glyph>
);

export const ExportIcon = (props: IconProps) => (
  <Glyph {...props}>
    <path d="M12 4v11" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M5 19.5h14" />
  </Glyph>
);

export const DiceIcon = (props: IconProps) => (
  <Glyph {...props}>
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <circle cx="9" cy="9" r="0.9" />
    <circle cx="15" cy="15" r="0.9" />
    <circle cx="15" cy="9" r="0.9" />
    <circle cx="9" cy="15" r="0.9" />
    <circle cx="12" cy="12" r="0.9" />
  </Glyph>
);
