"use client";

import { useEffect, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  className?: string;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

export function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  const safeValue = Number.isSafeInteger(value) && value >= 0 ? value : 0;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || safeValue === 0) {
      const animationFrameId = window.requestAnimationFrame(() => {
        setDisplayValue(safeValue);
      });

      return () => window.cancelAnimationFrame(animationFrameId);
    }

    const duration = 850;
    let animationFrameId = 0;
    let startedAt: number | null = null;

    const animate = (timestamp: number) => {
      startedAt ??= timestamp;
      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(Math.round(safeValue * easedProgress));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(animate);
      }
    };

    animationFrameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [safeValue]);

  return (
    <span className={className}>
      <span aria-hidden="true">{numberFormatter.format(displayValue)}</span>
      <span className="sr-only">{numberFormatter.format(safeValue)}</span>
    </span>
  );
}
