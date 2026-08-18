export type TrendBarItem = {
  key: string;
  label: string;
  value: number;
  valueLabel: string;
  accessibleLabel: string;
};

type TrendBarsProps = {
  items: TrendBarItem[];
  highestValue: number;
  tone?: "theme" | "success" | "warning";
};

const toneClasses = {
  theme: "bg-theme-primary",
  success: "bg-success",
  warning: "bg-warning",
};

export function TrendBars({
  items,
  highestValue,
  tone = "theme",
}: TrendBarsProps) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li
          key={item.key}
          className="grid grid-cols-[5.75rem_minmax(0,1fr)_2.5rem] items-center gap-3 sm:grid-cols-[6.5rem_minmax(0,1fr)_3rem]"
        >
          <span className="truncate text-sm font-medium text-app-secondary">
            {item.label}
          </span>
          <span
            className="h-2.5 overflow-hidden rounded-full bg-surface-muted"
            aria-hidden="true"
          >
            <span
              className={`block h-full rounded-full ${toneClasses[tone]}`}
              style={{ width: `${(item.value / Math.max(1, highestValue)) * 100}%` }}
            />
          </span>
          <span
            className="text-right text-sm font-semibold text-app-foreground"
            aria-label={item.accessibleLabel}
          >
            {item.valueLabel}
          </span>
        </li>
      ))}
    </ul>
  );
}
