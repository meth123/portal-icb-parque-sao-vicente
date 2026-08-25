import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/202608250007_create_testimonies.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const exclusiveReactionMigration = readFileSync(
  new URL(
    "../supabase/migrations/202608250008_make_testimony_reactions_exclusive.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const monthlyResetMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260825183348_reset_testimonies_monthly.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

test("garante uma publicação por pessoa e semana de São Paulo", () => {
  assert.match(migration, /time zone 'america\/sao_paulo'/);
  assert.match(migration, /extract\([\s\S]*isodow/);
  assert.match(migration, /isodow[\s\S]*::integer - 1/);
  assert.match(
    migration,
    /constraint testimonies_author_week_unique unique \(author_id, week_start\)/,
  );
  assert.match(migration, /grant insert \(content\)[\s\S]*testimonies/);
  assert.match(
    migration,
    /author_id = \(select auth\.uid\(\)\)[\s\S]*week_start = \(select public\.current_sao_paulo_week_start\(\)\)/,
  );
  assert.match(
    monthlyResetMigration,
    /unique \(author_id, week_start, month_start\)/,
  );
});

test("feed e limite semanal reiniciam no mês de São Paulo", () => {
  assert.match(monthlyResetMigration, /month_bounds as materialized/);
  assert.match(
    monthlyResetMigration,
    /testimonies\.created_at >= month_bounds\.starts_at/,
  );
  assert.match(
    monthlyResetMigration,
    /testimonies\.created_at < month_bounds\.ends_before/,
  );
  assert.match(
    monthlyResetMigration,
    /testimonies\.month_start = month_bounds\.starts_on/,
  );
  assert.match(monthlyResetMigration, /time zone 'america\/sao_paulo'/);
});

test("protege conteúdo, reações e exclusão no banco", () => {
  assert.match(migration, /char_length\(content\) between 1 and 400/);
  assert.match(
    migration,
    /unique \(testimony_id, user_id\)/,
  );
  assert.doesNotMatch(
    migration,
    /unique \(testimony_id, user_id, reaction_type\)/,
  );
  assert.match(
    migration,
    /references public\.testimonies \(id\) on delete cascade/,
  );
  assert.match(migration, /profiles\.global_role = 'administrator'/);
  assert.match(migration, /profiles\.is_supervisor = true/);
  assert.match(
    migration,
    /create policy "supervisors and administrators can delete testimonies"/,
  );
});

test("feed agrega reações e usa paginação por cursor em uma RPC", () => {
  assert.match(migration, /create function public\.get_testimonies_feed/);
  assert.match(migration, /limit \(select page_size \+ 1 from bounds\)/);
  assert.match(
    migration,
    /\(testimonies\.created_at, testimonies\.id\)[\s\S]*< \(target_cursor_created_at, target_cursor_id\)/,
  );
  assert.match(migration, /count\(\*\) filter/);
  assert.match(migration, /join page_rows on page_rows\.id = reactions\.testimony_id/);
  assert.match(migration, /bool_or\(/);
  assert.doesNotMatch(migration, /realtime/);
});

test("toggle de reação é atômico e mantém apenas Amém ou Curtir", () => {
  assert.match(migration, /create function public\.toggle_testimony_reaction/);
  assert.match(migration, /target_reaction_type not in \('amen', 'like'\)/);
  assert.match(migration, /delete from public\.testimony_reactions/);
  assert.match(
    migration,
    /on conflict \(testimony_id, user_id\) do update/,
  );
  assert.match(exclusiveReactionMigration, /row_number\(\) over/);
  assert.match(exclusiveReactionMigration, /reaction_position > 1/);
  assert.match(
    exclusiveReactionMigration,
    /add constraint testimony_reactions_unique[\s\S]*unique \(testimony_id, user_id\)/,
  );
});
