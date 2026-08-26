import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getWeeklyPushEvent,
  parsePushSimulationDate,
} from "../src/lib/push/events.ts";
import { parsePushSubscriptionInput } from "../src/lib/push/subscription-input.ts";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function readPngMetadata(relativePath: string) {
  const image = readFileSync(new URL(relativePath, import.meta.url));

  return {
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20),
    colorType: image[25],
  };
}

const subscriptionMigration = read(
  "../supabase/migrations/20260826170451_create_push_subscriptions.sql",
);
const eventMigration = read(
  "../supabase/migrations/20260826170454_create_push_notification_events.sql",
);
const serviceProfileGrantMigration = read(
  "../supabase/migrations/20260826183101_grant_push_service_profile_read.sql",
);
const eventSource = read("../src/lib/push/events.ts");
const weeklyJobSource = read("../src/lib/push/weekly-job.ts");
const cronSource = read("../src/app/api/cron/push-weekly/route.ts");
const settingsSource = read(
  "../src/app/(portal)/portal/perfil/notification-settings.tsx",
);
const serviceWorkerSource = read("../public/sw.js");

test("resolve os três eventos com textos, rotas e chaves estáveis", () => {
  const sunday = getWeeklyPushEvent(new Date("2026-08-16T12:00:00-03:00"));
  const monday = getWeeklyPushEvent(new Date("2026-08-17T12:00:00-03:00"));
  const wednesday = getWeeklyPushEvent(new Date("2026-08-19T12:00:00-03:00"));

  assert.deepEqual(sunday, {
    key: "weekly-form-last-day:2026-08-16",
    type: "weekly-form-last-day",
    date: "2026-08-16",
    weekEndsOn: "2026-08-16",
    title: "📝 Último dia para preencher a ficha",
    message: "Hoje é o último dia para preencher a ficha semanal.",
    destination: "/portal/relatorios/novo",
  });
  assert.deepEqual(monday, {
    key: "checklist-open:2026-08-17",
    type: "checklist-open",
    date: "2026-08-17",
    weekEndsOn: "2026-08-16",
    title: "📋 Checklist semanal disponível",
    message: "O checklist desta semana já está aberto. Toque para responder.",
    destination: "/portal/checklist",
  });
  assert.deepEqual(wednesday, {
    key: "checklist-last-day:2026-08-19",
    type: "checklist-last-day",
    date: "2026-08-19",
    weekEndsOn: "2026-08-16",
    title: "⏰ Último dia para finalizar o checklist",
    message: "Hoje é o último dia para finalizar o checklist semanal.",
    destination: "/portal/checklist",
  });
  assert.equal(
    getWeeklyPushEvent(new Date("2026-08-18T12:00:00-03:00")),
    null,
  );
});

test("usa a regra oficial do Checklist e respeita a virada de São Paulo", () => {
  assert.match(eventSource, /getWeeklyChecklistPeriod\(date\)/);

  const beforeMidnight = getWeeklyPushEvent(new Date("2026-08-17T02:59:00Z"));
  const afterMidnight = getWeeklyPushEvent(new Date("2026-08-17T03:01:00Z"));

  assert.equal(beforeMidnight?.key, "weekly-form-last-day:2026-08-16");
  assert.equal(afterMidnight?.key, "checklist-open:2026-08-17");
});

test("simula datas sem criar uma segunda regra de eventos", () => {
  assert.equal(
    parsePushSimulationDate("2026-08-17")?.toISOString(),
    "2026-08-17T12:00:00.000Z",
  );
  assert.equal(parsePushSimulationDate("2026-02-30"), null);
  assert.equal(parsePushSimulationDate("17/08/2026"), null);
  assert.match(cronSource, /getWeeklyPushEvent\(date\)/);
  assert.match(cronSource, /PUSH_TEST_MODE/);
  assert.match(cronSource, /VERCEL_ENV === "production"/);
});

test("valida subscriptions e aceita apenas endpoints HTTPS", () => {
  assert.deepEqual(
    parsePushSubscriptionInput({
      endpoint: "https://push.example.test/subscription/1",
      p256dh: "abc_DEF-123",
      auth: "auth_123-xyz",
    }),
    {
      endpoint: "https://push.example.test/subscription/1",
      p256dh: "abc_DEF-123",
      auth: "auth_123-xyz",
    },
  );
  assert.equal(
    parsePushSubscriptionInput({
      endpoint: "http://push.example.test/subscription/1",
      p256dh: "abc",
      auth: "def",
    }),
    null,
  );
});

test("RLS isola subscriptions e endpoint não pode duplicar", () => {
  assert.match(subscriptionMigration, /unique \(endpoint\)/i);
  assert.match(subscriptionMigration, /enable row level security/i);
  assert.match(subscriptionMigration, /to authenticated[\s\S]*auth\.uid\(\).*user_id/i);
  assert.match(subscriptionMigration, /references public\.profiles \(id\)/i);
  assert.match(subscriptionMigration, /is_active boolean not null default true/i);
  assert.match(
    serviceProfileGrantMigration,
    /grant select on table public\.profiles to service_role/i,
  );
});

test("reserva idempotência persistida antes de enviar", () => {
  assert.match(eventMigration, /event_key text primary key/i);
  assert.match(eventMigration, /revoke all[\s\S]*authenticated/i);
  assert.ok(
    weeklyJobSource.indexOf('.from("push_notification_events")') <
      weeklyJobSource.indexOf("const delivery = await deliverPushMessage"),
  );
  assert.match(weeklyJobSource, /error\?\.code === "23505"/);

  const first = getWeeklyPushEvent(new Date("2026-08-17T08:00:00-03:00"));
  const second = getWeeklyPushEvent(new Date("2026-08-17T20:00:00-03:00"));
  assert.equal(first?.key, second?.key);
});

test("Cron e cliente mantêm segredos e permissão protegidos", () => {
  assert.match(cronSource, /timingSafeEqual/);
  assert.match(cronSource, /Bearer \$\{secret\}/);
  assert.equal(
    settingsSource.match(/Notification\.requestPermission\(\)/g)?.length,
    1,
  );
  assert.doesNotMatch(settingsSource, /VAPID_PRIVATE_KEY|CRON_SECRET|SECRET_KEY/);
  assert.doesNotMatch(serviceWorkerSource, /addEventListener\("fetch"|caches\./);
});

test("usa assets específicos para o ícone e o badge Android", () => {
  assert.match(
    serviceWorkerSource,
    /icon: "\/icons\/notification-icon-192x192\.png"/,
  );
  assert.match(
    serviceWorkerSource,
    /badge: "\/icons\/notification-badge-96x96\.png"/,
  );
  assert.deepEqual(
    readPngMetadata("../public/icons/notification-icon-192x192.png"),
    { width: 192, height: 192, colorType: 6 },
  );
  assert.deepEqual(
    readPngMetadata("../public/icons/notification-badge-96x96.png"),
    { width: 96, height: 96, colorType: 6 },
  );
});
