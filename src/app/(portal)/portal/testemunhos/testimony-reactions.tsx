"use client";

import { useOptimistic, useState, useTransition } from "react";
import { classNames } from "@/lib/ui/class-names";
import {
  applyOptimisticTestimonyReaction,
  type TestimonyReactionState,
  type TestimonyReactionType,
} from "@/lib/testimonies";
import { toggleTestimonyReaction } from "./actions";

type TestimonyReactionsProps = TestimonyReactionState & {
  testimonyId: string;
};

export function TestimonyReactions({
  testimonyId,
  amenCount,
  likeCount,
  viewerAmen,
  viewerLike,
}: TestimonyReactionsProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [optimistic, updateOptimistic] = useOptimistic<
    TestimonyReactionState,
    TestimonyReactionType
  >(
    { amenCount, likeCount, viewerAmen, viewerLike },
    applyOptimisticTestimonyReaction,
  );

  function toggle(reactionType: TestimonyReactionType) {
    setError("");
    startTransition(async () => {
      updateOptimistic(reactionType);
      const result = await toggleTestimonyReaction(testimonyId, reactionType);
      if (!result.success) setError(result.message);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" aria-label="Reações">
        <ReactionButton
          emoji="🙏"
          label="Amém"
          count={optimistic.amenCount}
          active={optimistic.viewerAmen}
          disabled={pending}
          onClick={() => toggle("amen")}
        />
        <ReactionButton
          emoji="❤️"
          label="Curtir"
          count={optimistic.likeCount}
          active={optimistic.viewerLike}
          disabled={pending}
          onClick={() => toggle("like")}
        />
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ReactionButton({
  emoji,
  label,
  count,
  active,
  disabled,
  onClick,
}: {
  emoji: string;
  label: string;
  count: number;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${label}: ${count}`}
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-65 motion-reduce:transform-none",
        active
          ? "border-theme-primary-border bg-theme-primary-soft text-theme-primary-active"
          : "border-app-border bg-surface text-app-secondary hover:border-theme-primary-border hover:bg-theme-primary-subtle hover:text-app-foreground",
      )}
    >
      <span aria-hidden="true">{emoji}</span>
      <span>{count.toLocaleString("pt-BR")}</span>
      <span>{label}</span>
    </button>
  );
}
