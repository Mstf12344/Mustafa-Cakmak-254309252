// Dünya Mutfağı – e-postayla kayıt.
// Hesabı doğrulama e-postası beklemeden açar (Supabase'in ücretsiz e-posta servisi yalnızca proje ekibine mail gönderdiği için).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const ad = String(b.ad ?? "").trim().replace(/\s+/g, " ").slice(0, 20);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return json({ error: "email" }, 400);
  if (password.length < 6 || password.length > 72) return json({ error: "password" }, 400);
  if (ad && !/^[\p{L}\p{N}_. ]{3,20}$/u.test(ad)) return json({ error: "name" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: ad ? { ad } : {},
  });
  if (error) {
    const m = error.message || "";
    if (/already|registered|exists/i.test(m)) return json({ error: "exists" }, 409);
    return json({ error: m }, 400);
  }
  return json({ ok: true, id: data.user?.id });
});
