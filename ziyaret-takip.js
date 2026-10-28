/* ============================================================
   Dünya Mutfağı – ziyaret takibi
   index.html'in en sonuna <script> olarak gömülür.
   Sayfa açılışını, tarif açmayı ve pişirme modunu Supabase'deki
   ziyaret_kaydet() fonksiyonuna bildirir. Ad, e-posta, IP gibi
   kişisel bilgi göndermez; tarayıcıda rastgele bir kimlik tutar.
   Sonuçlar yonetim.html sayfasında görülür.
   ============================================================ */
(function () {
  "use strict";
  if (typeof SUPA_URL === "undefined" || typeof SUPA_KEY === "undefined") return;
  // Bilgisayarda dosya olarak açılan ve localhost denemeleri sayılmaz
  if (location.protocol === "file:" || /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)) return;

  const AUTH_KEY = "sb-" + new URL(SUPA_URL).hostname.split(".")[0] + "-auth-token";

  function rastgele() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }
  function kimlik(depo, anahtar) {
    try {
      let v = depo.getItem(anahtar);
      if (!v || !/^[A-Za-z0-9-]{8,64}$/.test(v)) { v = rastgele(); depo.setItem(anahtar, v); }
      return v;
    } catch (e) { return rastgele(); }
  }
  const ZIYARETCI = kimlik(localStorage, "dm-ziyaretci");
  const OTURUM = kimlik(sessionStorage, "dm-oturum");

  const ua = navigator.userAgent;
  const dokunmatikMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const cihaz = /iPad|Tablet/i.test(ua) || dokunmatikMac || (/Android/.test(ua) && !/Mobile/.test(ua))
    ? "tablet" : /Mobi|iPhone|iPod|Android/i.test(ua) ? "mobil" : "masaustu";
  const tarayici = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera"
    : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox|FxiOS/.test(ua) ? "Firefox"
    : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Diğer";
  const sistem = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iPod/.test(ua) || dokunmatikMac ? "iOS" : /CrOS/.test(ua) ? "ChromeOS"
    : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Diğer";
  let saatDilimi = null;
  try { saatDilimi = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) {}
  let yonlendiren = null;
  try {
    if (document.referrer) {
      const h = new URL(document.referrer).hostname.replace(/^www\./, "");
      if (h && h !== location.hostname.replace(/^www\./, "")) yonlendiren = h;
    }
  } catch (e) {}

  // Giriş yapılmışsa Supabase oturum anahtarı gönderilir; böylece kaydı kimin yaptığı bilinir
  function oturumAnahtari() {
    try {
      const s = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
      if (s && s.access_token && (!s.expires_at || s.expires_at * 1000 > Date.now() + 30000)) return s.access_token;
    } catch (e) {}
    return null;
  }

  function gonder(olay, tarif, tarifAd, tekrar) {
    const anahtar = tekrar ? null : oturumAnahtari();
    const govde = {
      p_ziyaretci: ZIYARETCI, p_oturum: OTURUM, p_olay: olay,
      p_tarif: tarif || null, p_tarif_ad: tarifAd || null,
      p_yonlendiren: olay === "sayfa" ? yonlendiren : null,
      p_cihaz: cihaz, p_tarayici: tarayici, p_sistem: sistem,
      p_dil: (navigator.language || "").split("@")[0].slice(0, 20) || null, p_saat_dilimi: saatDilimi
    };
    fetch(SUPA_URL + "/rest/v1/rpc/ziyaret_kaydet", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: SUPA_KEY,
        Authorization: "Bearer " + (anahtar || SUPA_KEY)
      },
      body: JSON.stringify(govde)
    }).then(function (r) {
      // Süresi dolmuş oturum anahtarı reddedilirse misafir olarak bir kez daha dene
      if (r.status === 401 && anahtar) gonder(olay, tarif, tarifAd, true);
    }).catch(function () {});
  }

  function tarifAdi(anahtar) {
    try {
      const r = typeof RECIPES !== "undefined" && RECIPES.find(function (x) { return x.key === anahtar; });
      return r ? String(r.title || "") : null;
    } catch (e) { return null; }
  }

  // Aynı tarif 10 saniye içinde tekrar açılırsa ikinci kez sayılmaz
  const sonKayit = {};
  function tekSefer(olay, anahtar) {
    const k = olay + ":" + anahtar, simdi = Date.now();
    if (sonKayit[k] && simdi - sonKayit[k] < 10000) return false;
    sonKayit[k] = simdi;
    return true;
  }

  // Sitenin kendi fonksiyonlarını sararak tarif açma ve pişirme modunu yakala
  if (typeof window.openSheet === "function") {
    const asilOpenSheet = window.openSheet;
    window.openSheet = function (key) {
      const sonuc = asilOpenSheet.apply(this, arguments);
      try { if (key && tekSefer("tarif", key)) gonder("tarif", key, tarifAdi(key)); } catch (e) {}
      return sonuc;
    };
  }
  if (typeof window.openCook === "function") {
    const asilOpenCook = window.openCook;
    window.openCook = function () {
      const sonuc = asilOpenCook.apply(this, arguments);
      try {
        const cookAcik = document.getElementById("cook");
        const key = typeof state !== "undefined" && state.open;
        if (key && cookAcik && cookAcik.classList.contains("open") && tekSefer("pisirme", key)) gonder("pisirme", key, tarifAdi(key));
      } catch (e) {}
      return sonuc;
    };
  }

  gonder("sayfa");
})();
