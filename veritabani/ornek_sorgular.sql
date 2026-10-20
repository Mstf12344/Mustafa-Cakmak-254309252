-- Dünya Mutfağı – örnek sorgular (sqlite3 dunya_mutfagi.db < ornek_sorgular.sql)
PRAGMA foreign_keys = ON;

-- 1) Ülkelere göre tarif sayısı ve ortalama kalori
SELECT u.ulke_adi, COUNT(t.tarif_id) AS tarif_sayisi, ROUND(AVG(t.kalori)) AS ort_kalori
FROM ulke u LEFT JOIN tarif t ON t.ulke_kodu = u.ulke_kodu
GROUP BY u.ulke_kodu ORDER BY tarif_sayisi DESC, u.ulke_adi;

-- 2) Gluten içermeyen vejetaryen tarifler (alerji tablosu üzerinden)
SELECT t.ad, u.ulke_adi, t.sure_dk
FROM tarif t JOIN ulke u USING (ulke_kodu)
WHERE t.vejetaryen = 1
  AND NOT EXISTS (SELECT 1 FROM tarif_alerji ta WHERE ta.tarif_id = t.tarif_id AND ta.alerji_kodu = 'gluten')
ORDER BY t.sure_dk;

-- 3) "Elimde ne var?": içinde mercimek geçen tarifler
SELECT DISTINCT t.ad, tm.miktar || ' ' || m.malzeme_adi AS malzeme
FROM tarif t JOIN tarif_malzeme tm USING (tarif_id) JOIN malzeme m USING (malzeme_id)
WHERE m.malzeme_adi LIKE '%mercimek%';

-- 4) Bir kullanıcının favorileri ve kaç kez pişirdiği
SELECT k.kullanici_adi, t.ad,
       (SELECT COUNT(*) FROM pisirme p WHERE p.kullanici_id = k.kullanici_id AND p.tarif_id = t.tarif_id) AS pisirme_sayisi
FROM favori f JOIN kullanici k USING (kullanici_id) JOIN tarif t USING (tarif_id)
ORDER BY k.kullanici_adi, pisirme_sayisi DESC;

-- 5) Veri ekleme ve güncelleme örneği
INSERT INTO favori (kullanici_id, tarif_id)
VALUES ((SELECT kullanici_id FROM kullanici WHERE kullanici_adi = 'deneme_ayse'),
        (SELECT tarif_id FROM tarif WHERE tarif_kodu = 'tr-10'));
UPDATE ayar SET tema = 'mint', hiz = 1.2
WHERE kullanici_id = (SELECT kullanici_id FROM kullanici WHERE kullanici_adi = 'deneme_ayse');
