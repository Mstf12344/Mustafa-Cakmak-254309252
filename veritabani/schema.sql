-- Dünya Mutfağı – SQLite veritabanı şeması
-- 4. haftadaki ER diyagramının fiziksel karşılığıdır (8 varlık + 6 ilişki tablosu).
PRAGMA foreign_keys = ON;

-- ================= İÇERİK TABLOLARI =================

CREATE TABLE ulke (
  ulke_kodu   TEXT PRIMARY KEY,                 -- 'tr', 'it' ...
  ulke_adi    TEXT NOT NULL UNIQUE,
  bayrak      TEXT,                             -- emoji
  renk        TEXT CHECK (renk GLOB '#[0-9A-Fa-f]*'),
  tanitim     TEXT
);

CREATE TABLE tarif (
  tarif_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  tarif_kodu   TEXT NOT NULL UNIQUE,             -- sitedeki anahtar: 'tr-0'
  ulke_kodu    TEXT NOT NULL REFERENCES ulke(ulke_kodu) ON UPDATE CASCADE ON DELETE RESTRICT,
  ad           TEXT NOT NULL,
  aciklama     TEXT,
  sure_dk      INTEGER CHECK (sure_dk > 0),
  sure_metni   TEXT,                             -- '2 saat + 1 gece ıslatma'
  porsiyon     TEXT,
  zorluk       TEXT NOT NULL CHECK (zorluk IN ('Kolay','Orta','Zor')),
  kalori       INTEGER CHECK (kalori IS NULL OR kalori >= 0),
  ipucu        TEXT,
  hikaye       TEXT,
  tarihi_mi    INTEGER NOT NULL DEFAULT 0 CHECK (tarihi_mi IN (0,1)),
  vejetaryen   INTEGER NOT NULL DEFAULT 0 CHECK (vejetaryen IN (0,1)),
  vegan        INTEGER NOT NULL DEFAULT 0 CHECK (vegan IN (0,1)),
  glutensiz    INTEGER NOT NULL DEFAULT 0 CHECK (glutensiz IN (0,1)),
  sutsuz       INTEGER NOT NULL DEFAULT 0 CHECK (sutsuz IN (0,1)),
  diyet_olumlu TEXT,
  diyet_dikkat TEXT,
  diyet_oneri  TEXT,
  kaynak       TEXT NOT NULL DEFAULT 'site' CHECK (kaynak IN ('site','themealdb')),
  themealdb_id TEXT UNIQUE
);
CREATE INDEX ix_tarif_ulke ON tarif(ulke_kodu);

-- Zayıf varlık: adım, tarif olmadan var olamaz
CREATE TABLE adim (
  tarif_id  INTEGER NOT NULL REFERENCES tarif(tarif_id) ON DELETE CASCADE,
  adim_no   INTEGER NOT NULL CHECK (adim_no > 0),
  metin     TEXT NOT NULL,
  PRIMARY KEY (tarif_id, adim_no)
);

CREATE TABLE malzeme (
  malzeme_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  malzeme_adi TEXT NOT NULL UNIQUE COLLATE NOCASE,
  kategori    TEXT
);

-- M:N  TARİF – MALZEME (İÇERİR)
CREATE TABLE tarif_malzeme (
  tarif_id    INTEGER NOT NULL REFERENCES tarif(tarif_id) ON DELETE CASCADE,
  malzeme_id  INTEGER NOT NULL REFERENCES malzeme(malzeme_id) ON DELETE RESTRICT,
  sira        INTEGER NOT NULL,
  miktar      TEXT,                              -- '1 su bardağı', '300 g'
  PRIMARY KEY (tarif_id, sira)
);
CREATE INDEX ix_tm_malzeme ON tarif_malzeme(malzeme_id);

CREATE TABLE alerji (
  alerji_kodu TEXT PRIMARY KEY,                  -- 'gluten', 'sut' ...
  alerji_adi  TEXT NOT NULL,
  simge       TEXT
);

-- M:N  TARİF – ALERJİ (TAŞIR)
CREATE TABLE tarif_alerji (
  tarif_id    INTEGER NOT NULL REFERENCES tarif(tarif_id) ON DELETE CASCADE,
  alerji_kodu TEXT    NOT NULL REFERENCES alerji(alerji_kodu),
  durum       TEXT    NOT NULL DEFAULT 'içerir' CHECK (durum IN ('içerir','içerebilir')),
  PRIMARY KEY (tarif_id, alerji_kodu)
);

CREATE TABLE restoran (
  restoran_id INTEGER PRIMARY KEY AUTOINCREMENT,
  ad          TEXT NOT NULL,
  sehir       TEXT NOT NULL,
  aciklama    TEXT,
  UNIQUE (ad, sehir)
);

-- M:N  RESTORAN – TARİF (SUNAR)
CREATE TABLE restoran_tarif (
  restoran_id   INTEGER NOT NULL REFERENCES restoran(restoran_id) ON DELETE CASCADE,
  tarif_id      INTEGER NOT NULL REFERENCES tarif(tarif_id) ON DELETE CASCADE,
  fiyat_bilgisi TEXT,
  aciklama      TEXT,
  PRIMARY KEY (restoran_id, tarif_id)
);

-- ================= KULLANICI TABLOLARI =================

CREATE TABLE kullanici (
  kullanici_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  kullanici_adi TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(kullanici_adi) BETWEEN 3 AND 20),
  sifre_ozeti   TEXT NOT NULL,                   -- PBKDF2-SHA256, düz şifre saklanmaz
  tuz           TEXT NOT NULL,
  avatar        TEXT,
  kayit_tarihi  TEXT NOT NULL DEFAULT (datetime('now')),
  hatali_deneme INTEGER NOT NULL DEFAULT 0,
  kilit_bitis   TEXT
);

-- 1:1  KULLANICI – AYAR (SAHİPTİR)
CREATE TABLE ayar (
  kullanici_id INTEGER PRIMARY KEY REFERENCES kullanici(kullanici_id) ON DELETE CASCADE,
  tema         TEXT NOT NULL DEFAULT 'red',
  ses_dili     TEXT,
  ses_adi      TEXT,
  ton          REAL CHECK (ton IS NULL OR ton BETWEEN 0 AND 2),
  hiz          REAL NOT NULL DEFAULT 1 CHECK (hiz BETWEEN 0.5 AND 2)
);

-- M:N  KULLANICI – TARİF (FAVORİ)
CREATE TABLE favori (
  kullanici_id   INTEGER NOT NULL REFERENCES kullanici(kullanici_id) ON DELETE CASCADE,
  tarif_id       INTEGER NOT NULL REFERENCES tarif(tarif_id) ON DELETE CASCADE,
  eklenme_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (kullanici_id, tarif_id)
);

-- M:N  KULLANICI – TARİF (NOT ALIR)
CREATE TABLE tarif_notu (
  kullanici_id      INTEGER NOT NULL REFERENCES kullanici(kullanici_id) ON DELETE CASCADE,
  tarif_id          INTEGER NOT NULL REFERENCES tarif(tarif_id) ON DELETE CASCADE,
  not_metni         TEXT NOT NULL CHECK (length(not_metni) <= 500),
  guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (kullanici_id, tarif_id)
);

-- M:N  KULLANICI – TARİF (PİŞİRİR): aynı tarif birden çok kez pişirilebilir
CREATE TABLE pisirme (
  pisirme_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  kullanici_id INTEGER NOT NULL REFERENCES kullanici(kullanici_id) ON DELETE CASCADE,
  tarif_id     INTEGER NOT NULL REFERENCES tarif(tarif_id) ON DELETE CASCADE,
  tarih        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX ix_pisirme_kullanici ON pisirme(kullanici_id, tarih);
