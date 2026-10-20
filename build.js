// Vercel derleme betiği: TheMealDB'deki tüm tarifleri çekip index.html'in içine gömer.
// Böylece yayındaki sitede tarifler ziyaretçinin tarayıcısında ayrıca indirilmeden, diğer tarifler gibi hazır gelir.
// Yerelde çalıştırma: node build.js   (çıktı: dist/index.html, dist/themealdb.json)
"use strict";
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "index.html");
const OUT = path.join(__dirname, "dist");
const API = "https://www.themealdb.com/api/json/v1/1/";
const MARK = "const MDB_EMBED=null;/*MDB_" + "EMBED*/";

// Sitedeki mdbSlim() ile aynı küçültülmüş biçim
function slim(m) {
  const g = [];
  for (let i = 1; i <= 20; i++) {
    const a = (m["strIngredient" + i] || "").trim(), b = (m["strMeasure" + i] || "").trim();
    if (a) g.push(b ? [a, b] : [a]);
  }
  const o = { i: m.idMeal, n: m.strMeal, a: m.strArea || "", c: m.strCategory || "", t: m.strTags || "", p: m.strMealThumb || "", s: m.strInstructions || "", g };
  if (m.strYoutube) o.y = m.strYoutube;
  if (m.strSource) o.u = m.strSource;
  return o;
}

async function getJSON(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }
}

async function main() {
  let html = fs.readFileSync(SRC, "utf8");
  fs.mkdirSync(OUT, { recursive: true });
  const all = new Map();
  let failed = [];
  for (const L of "abcdefghijklmnopqrstuvwxyz") {
    try {
      const j = await getJSON(API + "search.php?f=" + L);
      (j.meals || []).forEach(m => all.set(m.idMeal, slim(m)));
    } catch (e) {
      failed.push(L);
    }
  }
  if (failed.length) console.warn("Alınamayan harfler:", failed.join(", "));
  if (all.size && html.includes(MARK)) {
    const list = [...all.values()].sort((a, b) => a.n.localeCompare(b.n, "en"));
    const json = JSON.stringify(list).replace(/</g, "\\u003c").replace(new RegExp(String.fromCharCode(0x2028), "g"), "\\u2028").replace(new RegExp(String.fromCharCode(0x2029), "g"), "\\u2029");
    html = html.replace(MARK, () => "const MDB_EMBED=" + json + ";/*MDB_" + "EMBED*/");
    fs.writeFileSync(path.join(OUT, "themealdb.json"), JSON.stringify(list, null, 1));
    const areas = new Set(list.map(m => m.a));
    console.log(`TheMealDB: ${list.length} tarif, ${areas.size} ülke index.html içine gömüldü.`);
  } else {
    console.warn("TheMealDB verisi gömülemedi; site tarifleri tarayıcıda canlı çekecek.");
  }
  fs.writeFileSync(path.join(OUT, "index.html"), html);
}

main().catch(e => {
  console.error("Derleme hatası:", e);
  fs.mkdirSync(OUT, { recursive: true });
  fs.copyFileSync(SRC, path.join(OUT, "index.html"));
});
