import type { ManualName } from "../types";

type MemberRowProps = {
  member: ManualName;
  index: number;
  disabled: boolean;
  inputClassName: string;
  onNameChange: (name: string) => void;
  onRemove: () => void;
};

export function MemberRow({
  member,
  index,
  disabled,
  inputClassName,
  onNameChange,
  onRemove,
}: MemberRowProps) {
  return (
    <div className="grid gap-3 rounded-2xl border border-zinc-200 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <div>
        <label
          htmlFor={`member-${member.key}`}
          className="font-medium text-zinc-900"
        >
          Nome do membro {index + 1}
          <span aria-hidden="true" className="ml-1 text-red-700">
            *
          </span>
        </label>
        <input
          id={`member-${member.key}`}
          type="text"
          value={member.name}
          onChange={(event) => onNameChange(event.target.value)}
          required
          maxLength={200}
          disabled={disabled}
          className={inputClassName}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="min-h-12 rounded-xl border border-red-200 bg-white px-4 font-semibold text-red-800 hover:bg-red-50"
      >
        Remover
      </button>
    </div>
  );
}
