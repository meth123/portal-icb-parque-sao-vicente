import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

const userIds = [
  "7e570010-0827-4000-8000-000000000001",
  "7e570010-0827-4000-8000-000000000002",
  "7e570010-0827-4000-8000-000000000003",
  "7e570010-0827-4000-8000-000000000004",
  "7e570010-0827-4000-8000-000000000005",
];

const results = [];

for (const userId of userIds) {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  results.push({ userId, deleted: !error, error: error?.message ?? null });
}

process.stdout.write(`${JSON.stringify({ results })}\n`);
