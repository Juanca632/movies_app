import { useId, type SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps): IconProps => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
  ...props,
});

const stroke = (props: IconProps): IconProps => ({
  ...base(props),
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const StarIcon = (props: IconProps) => (
  <svg {...base(props)} fill="currentColor">
    <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
  </svg>
);

export const PlayIcon = (props: IconProps) => (
  <svg {...base(props)} fill="currentColor">
    <path d="M8 5.5v13l10.5-6.5z" />
  </svg>
);

export const SearchIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const ChevronRightIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export const UserIcon = (props: IconProps) => (
  <svg {...stroke(props)} strokeWidth={1.5}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </svg>
);

export const FilmIcon = (props: IconProps) => (
  <svg {...stroke(props)} strokeWidth={1.5}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M3 12h18" />
  </svg>
);

export const CalendarIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const ExternalIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

export const GlobeIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

export const ChevronDownIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const CheckIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const CloseIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const InfoIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.5v.01" />
  </svg>
);

export const TrophyIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z" />
  </svg>
);

/** The AI mark: two four-point stars filled with the AI gradient. */
export function AiSparkIcon(props: IconProps) {
  const id = useId();
  return (
    <svg {...base(props)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--color-ai-teal)" }} />
          <stop offset="0.4" style={{ stopColor: "var(--color-ai-violet)" }} />
          <stop offset="0.7" style={{ stopColor: "var(--color-ai-pink)" }} />
          <stop offset="1" style={{ stopColor: "var(--color-ai-amber)" }} />
        </linearGradient>
      </defs>
      <path
        fill={props.fill ?? `url(#${id})`}
        d="M10 5c.6 4.8 3.2 7.4 8 8-4.8.6-7.4 3.2-8 8-.6-4.8-3.2-7.4-8-8 4.8-.6 7.4-3.2 8-8zM18.5 2c.3 2.1 1.4 3.2 3.5 3.5-2.1.3-3.2 1.4-3.5 3.5-.3-2.1-1.4-3.2-3.5-3.5 2.1-.3 3.2-1.4 3.5-3.5z"
      />
    </svg>
  );
}

export const HomeIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </svg>
);

export const TvIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M8 2l4 4 4-4" />
  </svg>
);
