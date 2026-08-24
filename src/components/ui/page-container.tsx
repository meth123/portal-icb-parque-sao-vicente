import type { HTMLAttributes } from "react";
import { classNames } from "@/lib/ui/class-names";

type PageContainerProps = HTMLAttributes<HTMLDivElement> & {
  width?: "narrow" | "default" | "wide";
};

const widthClasses = {
  narrow: "max-w-2xl",
  default: "max-w-5xl",
  wide: "max-w-7xl",
};

export function PageContainer({
  className,
  width = "default",
  ...props
}: PageContainerProps) {
  return (
    <div
      className={classNames(
        "mx-auto w-full px-5 sm:px-7 lg:px-10",
        widthClasses[width],
        className,
      )}
      {...props}
    />
  );
}
