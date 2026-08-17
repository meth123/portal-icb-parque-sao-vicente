import Image from "next/image";
import { classNames } from "@/lib/ui/class-names";

type UserAvatarProps = {
  name: string;
  src?: string | null;
  size?: "small" | "default" | "large" | "xlarge";
  className?: string;
};

const sizeClasses = {
  small: "h-9 w-9 text-xs",
  default: "h-12 w-12 text-sm",
  large: "h-20 w-20 text-xl",
  xlarge: "h-28 w-28 text-3xl",
};

const pixelSizes = {
  small: 36,
  default: 48,
  large: 80,
  xlarge: 112,
};

function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("pt-BR"))
    .join("") || "?";
}

export function UserAvatar({
  name,
  src,
  size = "default",
  className,
}: UserAvatarProps) {
  return (
    <span
      className={classNames(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-theme-primary-border bg-theme-primary-soft font-semibold text-theme-primary-active",
        sizeClasses[size],
        className,
      )}
      aria-label={name}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={pixelSizes[size]}
          height={pixelSizes[size]}
          unoptimized
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initialsFor(name)}</span>
      )}
    </span>
  );
}
