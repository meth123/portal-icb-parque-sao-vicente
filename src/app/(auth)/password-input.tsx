"use client";

import { Eye, EyeOff } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { classNames } from "@/lib/ui/class-names";
import { authInputClassName } from "./auth-styles";

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const label = isVisible ? "Ocultar senha" : "Mostrar senha";

  return (
    <div className="relative">
      <input
        type={isVisible ? "text" : "password"}
        className={classNames(authInputClassName, "pr-14", className)}
        {...props}
      />
      <IconButton
        aria-label={label}
        title={label}
        size="compact"
        onClick={() => setIsVisible((current) => !current)}
        className="absolute right-0.5 top-0.5 border-transparent bg-transparent text-app-secondary hover:bg-theme-primary-subtle hover:text-theme-primary"
      >
        {isVisible ? (
          <EyeOff aria-hidden="true" size={20} strokeWidth={1.8} />
        ) : (
          <Eye aria-hidden="true" size={20} strokeWidth={1.8} />
        )}
      </IconButton>
    </div>
  );
}
