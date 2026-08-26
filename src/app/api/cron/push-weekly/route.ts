import { timingSafeEqual } from "node:crypto";
import {
  getWeeklyPushEvent,
  parsePushSimulationDate,
} from "@/lib/push/events";
import { runWeeklyPushJob } from "@/lib/push/weekly-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
};

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || !authorization) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json(
      { error: "UNAUTHORIZED" },
      { status: 401, headers: responseHeaders },
    );
  }

  const url = new URL(request.url);
  const requestedDate = url.searchParams.get("date");
  const executeSimulation = url.searchParams.get("execute") === "1";
  let date = new Date();

  if (requestedDate) {
    const parsedDate = parsePushSimulationDate(requestedDate);

    if (!parsedDate) {
      return Response.json(
        { error: "INVALID_DATE" },
        { status: 400, headers: responseHeaders },
      );
    }

    date = parsedDate;

    if (!executeSimulation) {
      return Response.json(
        {
          status: "simulation",
          executes: false,
          event: getWeeklyPushEvent(date),
        },
        { headers: responseHeaders },
      );
    }

    if (
      process.env.VERCEL_ENV === "production" ||
      process.env.PUSH_TEST_MODE !== "true"
    ) {
      return Response.json(
        { error: "SIMULATION_EXECUTION_DISABLED" },
        { status: 403, headers: responseHeaders },
      );
    }
  }

  try {
    const result = await runWeeklyPushJob(date);
    return Response.json(result, { headers: responseHeaders });
  } catch (error) {
    console.error(
      "Falha no Cron de Web Push.",
      error instanceof Error ? error.message : "UNKNOWN_ERROR",
    );
    return Response.json(
      { error: "PUSH_CRON_FAILED" },
      { status: 500, headers: responseHeaders },
    );
  }
}
