import { getImageProps } from "next/image";
import { annualTheme } from "@/config/annual-theme";
import { classNames } from "@/lib/ui/class-names";

type ThemeArtworkProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  decorative?: boolean;
  rounded?: boolean;
  sizes?: string;
};

export function ThemeArtwork({
  className,
  imageClassName,
  priority = false,
  decorative = false,
  rounded = true,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: ThemeArtworkProps) {
  const common = {
    alt: decorative ? "" : annualTheme.artwork.alt,
    sizes,
    fetchPriority: priority ? ("high" as const) : undefined,
  };
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({
    ...common,
    ...annualTheme.artwork.desktop,
    quality: 90,
  });
  const {
    props: { srcSet: mobileSrcSet, alt, ...mobileImageProps },
  } = getImageProps({
    ...common,
    ...annualTheme.artwork.mobile,
    quality: 90,
  });

  return (
    <div
      className={classNames(
        "relative min-h-40 overflow-hidden bg-theme-artwork",
        rounded && "rounded-2xl",
        className,
      )}
    >
      <picture>
        <source
          media="(min-width: 1024px)"
          sizes={sizes}
          srcSet={desktopSrcSet}
        />
        <source sizes={sizes} srcSet={mobileSrcSet} />
        {/* getImageProps keeps both art-directed sources inside Next's image pipeline. */}
        <img
          {...mobileImageProps}
          alt={alt}
          className={classNames(
            "absolute inset-0 h-full w-full object-cover",
            imageClassName,
          )}
          style={{ objectPosition: annualTheme.artwork.focalPosition }}
        />
      </picture>
    </div>
  );
}
