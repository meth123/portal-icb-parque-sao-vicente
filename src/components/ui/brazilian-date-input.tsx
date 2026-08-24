"use client";

import { CalendarDays } from "lucide-react";
import { useRef, useState } from "react";
import { classNames } from "@/lib/ui/class-names";

type BrazilianDateInputProps = {
  id: string;
  name: string;
  defaultValue: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

function formatBrazilianDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function parseBrazilianDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return "";

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return "";
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function BrazilianDateInput({
  id,
  name,
  defaultValue,
  min,
  max,
  required = false,
  disabled = false,
  className,
}: BrazilianDateInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [displayValue, setDisplayValue] = useState(() =>
    formatBrazilianDate(defaultValue),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarInputRef = useRef<HTMLInputElement>(null);

  function updateValue(nextValue: string, nextDisplayValue: string) {
    const outsideRange =
      Boolean(nextValue) &&
      ((min !== undefined && nextValue < min) ||
        (max !== undefined && nextValue > max));

    setDisplayValue(nextDisplayValue);
    setValue(outsideRange ? "" : nextValue);
    inputRef.current?.setCustomValidity(
      !nextValue
        ? "Informe uma data válida no formato dia/mês/ano."
        : outsideRange
          ? "Informe uma data dentro do período permitido."
          : "",
    );
  }

  return (
    <div className="relative min-w-0">
      <input type="hidden" name={name} value={value} />
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        value={displayValue}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
          const formatted = [
            digits.slice(0, 2),
            digits.slice(2, 4),
            digits.slice(4, 8),
          ]
            .filter(Boolean)
            .join("/");

          updateValue(parseBrazilianDate(formatted), formatted);
        }}
        required={required}
        maxLength={10}
        pattern="\d{2}/\d{2}/\d{4}"
        title="Informe a data no formato dia/mês/ano."
        disabled={disabled}
        className={classNames(className, "pr-12")}
      />
      <button
        type="button"
        aria-label="Abrir calendário"
        disabled={disabled}
        onClick={() => {
          const calendarInput = calendarInputRef.current;
          if (!calendarInput) return;

          if (typeof calendarInput.showPicker === "function") {
            calendarInput.showPicker();
          } else {
            calendarInput.focus();
            calendarInput.click();
          }
        }}
        className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-[0.625rem] text-app-secondary transition-[background-color,color,transform] duration-150 hover:bg-surface-muted active:scale-[0.94] active:bg-theme-primary-soft active:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus disabled:opacity-60 disabled:active:scale-100 motion-reduce:transform-none"
      >
        <CalendarDays aria-hidden="true" className="size-5" />
      </button>
      <input
        ref={calendarInputRef}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const nextValue = event.target.value;
          updateValue(nextValue, formatBrazilianDate(nextValue));
        }}
        aria-label="Selecionar data no calendário"
        lang="pt-BR"
        disabled={disabled}
        tabIndex={-1}
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
    </div>
  );
}
