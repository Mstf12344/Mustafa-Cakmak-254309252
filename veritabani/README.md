# Dünya Mutfağı – SQLite veritabanı

4. haftadaki ER diyagramının fiziksel karşılığı: 8 varlık + 6 ilişki tablosu (14 tablo).

| Dosya | Açıklama |
|---|---|
| `schema.sql` | Tüm `CREATE TABLE` komutları (PK, FK, CHECK, UNIQUE, dizinler) |
| `seed.js` | Veritabanını kurar ve sitenin verileriyle doldurur |
| `site_data.json` | Siteden çıkarılan veriler (10 ülke, 32 tarif) |
| `ornek_sorgular.sql` | Örnek SELECT / INSERT / UPDATE sorguları |
| `dunya_mutfagi.db` | Hazır, dolu veritabanı dosyası |

## Kurulum

Node.js 22.5 veya üstü yeterlidir (yerleşik `node:sqlite`, ek paket gerekmez):

```bash
cd veritabani
node seed.js
```

Çıktı tablo başına kayıt sayılarını ve `foreign_key_check` sonucunu yazar. `kullanici` tablosundaki `deneme_ayse` ve `deneme_mehmet` yalnızca test için eklenmiş örnek kayıtlardır.
