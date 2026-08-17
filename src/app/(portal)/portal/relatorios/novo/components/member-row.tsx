import { Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
      <div className="min-w-0">
        <label
          htmlFor={`member-${member.key}`}
          className="font-medium text-app-foreground"
        >
          Participante {index + 1}
          <span aria-hidden="true" className="ml-1 text-danger">
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
      <IconButton
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remover participante ${index + 1}`}
        title="Remover participante"
        className="text-danger"
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
