// Dünya Mutfağı – yeni hesaba "hoş geldin" e-postası.
// auth.users tablosundaki tetikleyici her yeni kullanıcı için bu fonksiyonu {id} ile çağırır.
// Güvenlik: fonksiyon yalnızca son 15 dakikada açılmış ve daha önce e-posta almamış bir hesaba, bir kez gönderir.
// Gönderim Gmail üzerinden yapılır: GMAIL_USER ve GMAIL_APP_PASSWORD gizli değişkenleri gerekir.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import nodemailer from "npm:nodemailer@6.9.14";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const SITE = "https://dunya-mutfagi.vercel.app";

function mail(ad: string) {
  const selam = ad ? `Hi ${esc(ad)},` : "Hi,";
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#FBF3E8;font-family:Arial,Helvetica,sans-serif;color:#2B1311">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF3E8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:#2B1311;padding:28px 28px 22px;color:#FBF3E8">
<div style="font-size:13px;letter-spacing:3px;color:#F2B866;font-weight:bold">WORLD KITCHEN</div>
<div style="font-size:28px;font-weight:bold;margin-top:8px">Welcome to the kitchen! 🍽️</div></td></tr>
<tr><td style="padding:26px 28px;font-size:16px;line-height:1.6">
<p style="margin:0 0 14px">${selam}</p>
<p style="margin:0 0 14px">Your World Kitchen account is ready. Around 2,000 recipes from more than 100 cuisines are waiting for you.</p>
<ul style="margin:0 0 18px;padding-left:20px">
<li>❤️ Your favourites, notes and settings follow you on every device</li>
<li>🧺 Use “What’s in my kitchen?” to find dishes from what you already have</li>
<li>🎡 Can’t decide? Spin the food wheel</li></ul>
<p style="margin:0 0 22px"><a href="${SITE}" style="display:inline-block;background:#B4472F;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:12px">Go to the kitchen</a></p>
<p style="margin:0;font-size:13px;color:#7A5B50">If you didn’t create this account, you can ignore this e-mail. <a href="${SITE}/gizlilik.html" style="color:#7A5B50">Privacy Policy</a></p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `${ad ? "Hi " + ad + "," : "Hi,"}\n\nYour World Kitchen account is ready. Around 2,000 recipes from more than 100 cuisines are waiting for you.\n\nGo to the kitchen: ${SITE}\n\nIf you didn’t create this account, you can ignore this e-mail.`;
  return { html, text };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let id = "";
  try { id = String((await req.json()).id || ""); } catch { return json({ error: "bad_json" }, 400); }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "id" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: u, error } = await admin.auth.admin.getUserById(id);
  if (error || !u?.user?.email) return json({ error: "user" }, 404);
  const user = u.user;
  if (Date.now() - Date.parse(user.created_at) > 15 * 60 * 1000) return json({ skipped: "old" });
  const { data: done } = await admin.from("hosgeldin_kayit").select("kullanici_id").eq("kullanici_id", id).maybeSingle();
  if (done) return json({ skipped: "sent" });

  const GU = Deno.env.get("GMAIL_USER"), GP = Deno.env.get("GMAIL_APP_PASSWORD");
  if (!GU || !GP) return json({ skipped: "no_mail_config" });

  const md = user.user_metadata || {};
  const ad = String(md.ad || md.full_name || md.name || "").slice(0, 40);
  const { html, text } = mail(ad);
  // kaydı önce yaz: aynı anda iki çağrı gelirse ikincisi e-posta göndermesin
  const { error: insErr } = await admin.from("hosgeldin_kayit").insert({ kullanici_id: id });
  if (insErr) return json({ skipped: "sent" });
  try {
    const tr = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: GU, pass: GP.replace(/\s+/g, "") } });
    await tr.sendMail({ from: `"World Kitchen" <${GU}>`, to: user.email, subject: "Welcome to World Kitchen! 🍽️", text, html });
    return json({ ok: true });
  } catch (e) {
    await admin.from("hosgeldin_kayit").delete().eq("kullanici_id", id);
    console.error("Gmail gönderim hatası:", (e as Error).message);
    return json({ error: "send" }, 502);
  }
});
