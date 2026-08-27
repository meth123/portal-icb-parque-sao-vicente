import { randomBytes } from "node:crypto";
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

const definitions = [
  {
    id: "7e570010-0827-4000-8000-000000000001",
    email: "mariana.souza.teste@example.com",
    fullName: "Mariana Souza",
  },
  {
    id: "7e570010-0827-4000-8000-000000000002",
    email: "rodrigo.almeida.teste@example.com",
    fullName: "Rodrigo Almeida",
  },
  {
    id: "7e570010-0827-4000-8000-000000000003",
    email: "maria.oliveira.teste@example.com",
    fullName: "Maria Oliveira",
  },
  {
    id: "7e570010-0827-4000-8000-000000000004",
    email: "joao.santos.teste@example.com",
    fullName: "João Pedro Santos",
  },
  {
    id: "7e570010-0827-4000-8000-000000000005",
    email: "ana.costa.teste@example.com",
    fullName: "Ana Clara Costa",
  },
];

const created = [];

try {
  for (const definition of definitions) {
    const password = `T!${randomBytes(7).toString("base64url")}7a`;
    const { data, error } = await supabase.auth.admin.createUser({
      id: definition.id,
      email: definition.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: definition.fullName },
    });

    if (error || !data.user) {
      throw error ?? new Error(`USER_NOT_CREATED:${definition.email}`);
    }

    created.push({ ...definition, password });
  }

  process.stdout.write(`${JSON.stringify({ created })}\n`);
} catch (error) {
  for (const user of created.reverse()) {
    await supabase.auth.admin.deleteUser(user.id);
  }

  throw error;
}
