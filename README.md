# Dünya Mutfağı

Mustafa Çakmak (254309252) – Mesleki Çözümleme I dönem projesi.

10 ülkenin mutfağından hikâyeli tarifler sunan bir tarif sitesi. Site tek bir HTML dosyasından oluşur (`index.html`); kurulum veya derleme gerektirmez.

## Özellikler
- 32 özel tarif: malzemeler, adım adım yapılış, hikâye, "Nerede yenir?", diyet ve alerji bilgisi
- Wikibooks tarifleri: Wikibooks Cookbook'taki yaklaşık 1.900 dünya mutfağı tarifi sitenin listesine eklenir (alerji ve diyet bilgisi otomatik çıkarılır, kaynak ve lisans her tarifte gösterilir)
- Pişirme modu, zamanlayıcı, sesli okuma
- Şef: soru-cevap ve sesli sohbet asistanı (15 dilde ses)
- İki aşamalı yemek çarkı, arama önerileri, "Elimde ne var?"
- Hesap sistemi: kullanıcı adıyla (bu tarayıcıda) ya da e-postayla (Supabase; favoriler, notlar ve ayarlar her cihazda eşitlenir), favoriler, notlar, rozetler
- 19 tema, Türkçe/İngilizce

## Dosyalar
- `index.html` – sitenin güncel sürümü (Vercel bu dosyayı yayınlar)
- `dunya-mutfagi MUSTAFA ÇAKMAK 3 HAFTA.html`, `dunya-mutfagi MUSTAFA ÇAKMAK 4 HAFTA.html` – haftalık teslim sürümleri
- `4. Hafta Rapor/` – 4. hafta laboratuvar raporu (PDF, Word) ve ER diyagramı
- `5. Hafta Rapor/` – 5. hafta veri tabanı raporu (PDF, Word)
- `veritabani/` – SQLite veritabanı: şema, kurulum betiği (`node seed.js`), örnek sorgular ve hazır `dunya_mutfagi.db`

## Yayına alma (Vercel)
Depo Vercel'deki **dunya-mutfagi** projesine bağlıdır; `main` dalına yapılan her gönderim siteyi otomatik günceller: https://dunya-mutfagi.vercel.app
Site derleme gerektirmez; Vercel `index.html` dosyasını olduğu gibi yayınlar.

## E-postayla giriş (Supabase)
E-posta hesapları [Supabase Auth](https://supabase.com/docs/guides/auth) ile tutulur (proje: `dunya-mutfagi`, bölge eu-central-1). Her kullanıcının site verileri `profil_verisi` tablosunda tek satır JSON olarak saklanır; RLS kuralları sayesinde herkes yalnızca kendi satırını okuyup yazabilir. `index.html`'deki `SUPA_KEY` herkese açık "anon" anahtarıdır. Kayıt, `kayit` adlı Edge Function ile yapılır: hesap doğrulama e-postası beklemeden açılır (Supabase'in ücretsiz e-posta servisi yalnızca proje ekibine mail gönderdiği için). Google ile giriş için Supabase'de Google sağlayıcısı açılıp `SUPA_GOOGLE` true yapılmalıdır.

## Wikibooks tarifleri
Tarifler `index.html` içindeki `WB_DATA` alanına gömülüdür; site internetten tarif çekmez (yalnızca fotoğraflar Wikimedia Commons'tan yüklenir).

- `tools/wikibooks/cek.js` – Wikibooks API'sinden "Recipes by origin" kategorisindeki tarifleri, malzemeleri, adımları ve fotoğraf lisanslarını çeker (`tools/wikibooks/out/wikibooks_ham.json`).
- `tools/wikibooks/donustur.js` – ham veriyi sitenin biçimine çevirir ve `index.html` içine gömer.
- GitHub'da **Actions → "Wikibooks tariflerini güncelle" → Run workflow** ile ikisi birlikte çalıştırılıp güncel tarifler depoya kaydedilir.

### Lisans
Tarif metinleri [Wikibooks Cookbook](https://en.wikibooks.org/wiki/Cookbook) yazarlarına aittir ve [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.tr) lisansıyla paylaşılır; sitede her tarifin "Hikâyesi" sekmesinde kaynak sayfasına bağlantı verilir. Fotoğraflar Wikimedia Commons'tandır ve her birinin yazarı ile lisansı tarifin yanında gösterilir. Sitenin kodu ve kendi 32 tarifi bu lisansın dışındadır.
