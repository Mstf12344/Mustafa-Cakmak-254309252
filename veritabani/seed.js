// Dünya Mutfağı – SQLite veritabanını oluşturur ve sitedeki verilerle doldurur.
// Kullanım:  node seed.js            (Node.js 22.5+ – yerleşik node:sqlite, ek paket gerekmez)
// Çıktı:     dunya_mutfagi.db
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const DIR = __dirname;
const DB_FILE = path.join(DIR, "dunya_mutfagi.db");
const data = JSON.parse(fs.readFileSync(path.join(DIR, "site_data.json"), "utf8"));

if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
const db = new DatabaseSync(DB_FILE);
db.exec(fs.readFileSync(path.join(DIR, "schema.sql"), "utf8"));
db.exec("PRAGMA foreign_keys = ON;");

/* ---------- yardımcılar ---------- */
const UNITS = ["su bardağı","çay bardağı","yemek kaşığı","tatlı kaşığı","çay kaşığı","kahve fincanı","kahve kaşığı","paket","demet","tutam",
  "litre","adet","avuç","dilim","parça","yaprak","kase","bardak","fincan","diş","dal","sap","tane","kutu","kg","gr","g","ml","l","yk","çk"];
const AMOUNT = "(?:\\d+(?:[.,]\\d+)?(?:\\s*[–-]\\s*\\d+(?:[.,]\\d+)?)?(?:\\s*\\/\\s*\\d+)?|yarım|birkaç|bir)";
const RE = new RegExp(`^(${AMOUNT}(?:\\s+(?:${UNITS.join("|")})(?=\\s|$))?(?:\\s*\\(tepeleme\\))?)\\s+(.+)$`, "i");
function splitIngredient(line) {
  const m = line.trim().match(RE);
  if (!m) return { miktar: null, ad: line.trim() };
  return { miktar: m[1].trim(), ad: m[2].trim() };
}
const CATS = [
  ["Baharat ve ot", /tuz|karabiber|kimyon|pul biber|tarçın|nane|kekik|fesleğen|maydanoz|kişniş|zerdeçal|garam|safran|defne|biberiye|vanilin|yenibahar|toz kırmızı biber|sichuan|kakao/i],
  ["Sıvı ve et suyu", /suyu|(^|\s)su(\s|$)|kahve|espresso|şarap|dashi/i],
  ["Süt ürünü ve yumurta", /süt|yoğurt|peynir|kaşar|tereyağ|krema|mascarpone|mozzarella|parmesan|pecorino|gruy|ghee|yumurta/i],
  ["Et, tavuk ve deniz ürünü", /kıyma|(^|\s)et(\s|$)|eti|tavuk|kuzu|dana|antrikot|bonfile|karides|guanciale|pastırma/i],
  ["Tahıl ve hamur", /(^|\s)un(\s|$)|unu|pirinç|bulgur|buğday|makarna|spagetti|erişte|ekmek|baget|yufka|tortilla|pide|bisküvi|nişasta|maya|tteok/i],
  ["Bakliyat", /mercimek|nohut|fasulye|tofu|miso/i],
  ["Sos ve yağ", /yağ|salça|sos|sirke|mirin|ezmesi|gochujang|bal\b/i],
  ["Sebze, meyve ve kuruyemiş", /.*/]
];
const category = n => (CATS.find(([, re]) => re.test(n)) || ["Diğer"])[0];
const LEVEL = l => (["Kolay", "Orta", "Zor"].includes(l) ? l : "Orta");

/* ---------- ülkeler ---------- */
const insUlke = db.prepare("INSERT INTO ulke (ulke_kodu, ulke_adi, bayrak, renk, tanitim) VALUES (?,?,?,?,?)");
for (const c of data.countries) insUlke.run(c.id, c.name, c.flag, c.color, c.intro || null);

/* ---------- alerjiler ---------- */
const insAlerji = db.prepare("INSERT INTO alerji (alerji_kodu, alerji_adi, simge) VALUES (?,?,?)");
for (const [k, [icon, tr]] of Object.entries(data.alg)) insAlerji.run(k, tr, icon);

/* ---------- tarifler ve bağlı tablolar ---------- */
const insTarif = db.prepare(`INSERT INTO tarif (tarif_kodu, ulke_kodu, ad, aciklama, sure_dk, sure_metni, porsiyon, zorluk, kalori, ipucu, hikaye,
  tarihi_mi, vejetaryen, vegan, glutensiz, sutsuz, diyet_olumlu, diyet_dikkat, diyet_oneri) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const insAdim = db.prepare("INSERT INTO adim (tarif_id, adim_no, metin) VALUES (?,?,?)");
const getMalz = db.prepare("SELECT malzeme_id FROM malzeme WHERE malzeme_adi = ?");
const insMalz = db.prepare("INSERT INTO malzeme (malzeme_adi, kategori) VALUES (?,?)");
const insTM = db.prepare("INSERT INTO tarif_malzeme (tarif_id, malzeme_id, sira, miktar) VALUES (?,?,?,?)");
const insTA = db.prepare("INSERT INTO tarif_alerji (tarif_id, alerji_kodu, durum) VALUES (?,?,?)");
const getRest = db.prepare("SELECT restoran_id FROM restoran WHERE ad = ? AND sehir = ?");
const insRest = db.prepare("INSERT INTO restoran (ad, sehir) VALUES (?,?)");
const insRT = db.prepare("INSERT OR IGNORE INTO restoran_tarif (restoran_id, tarif_id, fiyat_bilgisi, aciklama) VALUES (?,?,?,?)");

db.exec("BEGIN");
for (const r of data.recipes) {
  const d = r.diet || { a: [], m: [], d: [], p: [null], w: [null], s: [null] };
  const has = x => (d.d.includes(x) ? 1 : 0);
  const { lastInsertRowid: tid } = insTarif.run(r.key, r.country, r.title, r.desc, r.mins || null, r.time, r.serves, LEVEL(r.level),
    r.kcal, r.tip || null, r.story || null, r.legend ? 1 : 0, has("veg"), has("vegan"), has("gf"), has("df"), d.p[0], d.w[0], d.s[0]);
  r.steps.forEach((s, i) => insAdim.run(tid, i + 1, s));
  r.ing.forEach((line, i) => {
    const { miktar, ad } = splitIngredient(line);
    let row = getMalz.get(ad);
    const mid = row ? row.malzeme_id : insMalz.run(ad, category(ad)).lastInsertRowid;
    insTM.run(tid, mid, i + 1, miktar);
  });
  (d.a || []).forEach(k => insTA.run(tid, k, "içerir"));
  (d.m || []).forEach(k => insTA.run(tid, k, "içerebilir"));
  for (const w of [...r.where, ...r.whereTr]) {
    let row = getRest.get(w.n, w.c);
    const rid = row ? row.restoran_id : insRest.run(w.n, w.c).lastInsertRowid;
    insRT.run(rid, tid, w.ptr || null, w.tr || null);
  }
}
db.exec("COMMIT");

/* ---------- örnek (test) kullanıcıları ---------- */
// Sitedeki gibi: PBKDF2-SHA256, 100.000 tur, rastgele tuz
function hash(pass, salt) { return "p2$" + crypto.pbkdf2Sync(pass, salt, 100000, 32, "sha256").toString("hex"); }
const insUser = db.prepare("INSERT INTO kullanici (kullanici_adi, sifre_ozeti, tuz, avatar) VALUES (?,?,?,?)");
const insAyar = db.prepare("INSERT INTO ayar (kullanici_id, tema, ses_dili, ton, hiz) VALUES (?,?,?,?,?)");
const tarifId = k => db.prepare("SELECT tarif_id FROM tarif WHERE tarif_kodu = ?").get(k).tarif_id;
const demo = [
  { ad: "deneme_ayse", av: "🍲", tema: "cream", dil: "tr-TR", fav: ["tr-0", "it-1", "jp-0"], not: ["tr-0", "Biraz daha limon iyi oldu."], pis: ["tr-0", "tr-0", "in-1"] },
  { ad: "deneme_mehmet", av: "🍕", tema: "galaxy", dil: "en-US", fav: ["it-2", "mx-0"], not: ["it-2", "Hamuru bir gece dinlendirdim."], pis: ["it-2"] }
];
for (const u of demo) {
  const salt = crypto.randomBytes(16).toString("hex");
  const uid = insUser.run(u.ad, hash("1234", salt), salt, u.av).lastInsertRowid;
  insAyar.run(uid, u.tema, u.dil, 1, 1);
  u.fav.forEach(k => db.prepare("INSERT INTO favori (kullanici_id, tarif_id) VALUES (?,?)").run(uid, tarifId(k)));
  db.prepare("INSERT INTO tarif_notu (kullanici_id, tarif_id, not_metni) VALUES (?,?,?)").run(uid, tarifId(u.not[0]), u.not[1]);
  u.pis.forEach(k => db.prepare("INSERT INTO pisirme (kullanici_id, tarif_id) VALUES (?,?)").run(uid, tarifId(k)));
}

/* ---------- özet ---------- */
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
for (const { name } of tables) console.log(name.padEnd(16), db.prepare(`SELECT COUNT(*) n FROM ${name}`).get().n);
const fk = db.prepare("PRAGMA foreign_key_check").all();
console.log("foreign_key_check:", fk.length ? fk : "sorun yok");
db.close();
