type Variant = "neutral" | "danger" | "primary";

const VARIANT_CLASSES: Record<Variant, string> = {
  neutral: "border-neutral-300 text-neutral-500 hover:bg-neutral-100 hover:border-neutral-400",
  danger: "border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400",
  primary: "border-orange-300 text-orange-500 hover:bg-orange-50 hover:border-orange-400",
};

const SIZE_CLASSES = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
};

type Props = {
  onClick: () => void;
  title: string;
  variant?: Variant;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  children: React.ReactNode;
};

export function IconButton({ onClick, title, variant = "neutral", size = "sm", className = "", children }: Props) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`flex shrink-0 items-center justify-center rounded-full border bg-white transition-colors ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {children}
    </button>
  );
}
