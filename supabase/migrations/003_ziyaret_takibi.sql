-- Ziyaret takibi: siteye kaç kişi girdi, hangi tariflere bakıldı, kimler kullanıyor.
-- Kayıtlar "private" şemasında tutulur; API üzerinden doğrudan okunamaz ve yazılamaz.
-- Site yalnızca ziyaret_kaydet() fonksiyonunu çağırabilir, istatistikleri yalnızca
-- yönetici yonetim_ozet() fonksiyonuyla görebilir.

create schema if not exists private;

-- ================= YÖNETİCİLER =================
-- Yönetim panelini görebilecek hesaplar.
-- Yönetici eklemek için (SQL Editor'de bir kez çalıştırılır, e-posta depoya yazılmaz):
--   insert into private.yonetici select id from auth.users where email = 'SENIN_EPOSTAN';
create table if not exists private.yonetici (
  kullanici_id uuid primary key references auth.users(id) on delete cascade
);
alter table private.yonetici enable row level security;

-- ================= ZİYARET KAYITLARI =================
create table if not exists private.ziyaret (
  id           bigint generated always as identity primary key,
  zaman        timestamptz not null default now(),
  ziyaretci    text not null check (ziyaretci ~ '^[A-Za-z0-9-]{8,64}$'),   -- tarayıcıda saklanan rastgele kimlik
  oturum       text not null check (oturum ~ '^[A-Za-z0-9-]{8,64}$'),      -- sekme açık kaldığı sürece aynı
  kullanici_id uuid references auth.users(id) on delete set null,          -- giriş yapmışsa
  olay         text not null check (olay in ('sayfa', 'tarif', 'pisirme')),
  tarif        text check (char_length(tarif) <= 40),                      -- tarif anahtarı: 'tr-0'
  tarif_ad     text check (char_length(tarif_ad) <= 80),
  yonlendiren  text check (char_length(yonlendiren) <= 120),               -- nereden geldi (google.com ...)
  cihaz        text check (cihaz in ('mobil', 'tablet', 'masaustu')),
  tarayici     text check (char_length(tarayici) <= 30),
  sistem       text check (char_length(sistem) <= 30),
  dil          text check (char_length(dil) <= 20),
  saat_dilimi  text check (char_length(saat_dilimi) <= 60)                  -- yaklaşık konum: 'Europe/Istanbul'
);
create index if not exists ix_ziyaret_zaman on private.ziyaret (zaman desc);
create index if not exists ix_ziyaret_ziyaretci on private.ziyaret (ziyaretci, zaman desc);
create index if not exists ix_ziyaret_kullanici on private.ziyaret (kullanici_id) where kullanici_id is not null;
alter table private.ziyaret enable row level security;

-- ================= KAYIT FONKSİYONU (site çağırır) =================
create or replace function public.ziyaret_kaydet(
  p_ziyaretci   text,
  p_oturum      text,
  p_olay        text,
  p_tarif       text default null,
  p_tarif_ad    text default null,
  p_yonlendiren text default null,
  p_cihaz       text default null,
  p_tarayici    text default null,
  p_sistem      text default null,
  p_dil         text default null,
  p_saat_dilimi text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Aynı tarayıcıdan saatte 300'den fazla kayıt alınmaz (kötüye kullanımı önler)
  if (select count(*) from private.ziyaret
      where ziyaretci = p_ziyaretci and zaman > now() - interval '1 hour') >= 300 then
    return;
  end if;

  insert into private.ziyaret
    (ziyaretci, oturum, kullanici_id, olay, tarif, tarif_ad, yonlendiren,
     cihaz, tarayici, sistem, dil, saat_dilimi)
  values
    (p_ziyaretci, p_oturum, auth.uid(), p_olay, left(p_tarif, 40), left(p_tarif_ad, 80),
     left(nullif(p_yonlendiren, ''), 120), p_cihaz, left(p_tarayici, 30), left(p_sistem, 30),
     left(p_dil, 20), left(p_saat_dilimi, 60));
end;
$$;
revoke all on function public.ziyaret_kaydet(text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.ziyaret_kaydet(text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

-- ================= İSTATİSTİK FONKSİYONU (yönetim paneli çağırır) =================
-- p_gun: son kaç günün verisi (1–365). Günler Türkiye saatine göre hesaplanır.
create or replace function public.yonetim_ozet(p_gun int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_gun   int := greatest(1, least(coalesce(p_gun, 30), 365));
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_bas   timestamptz;
  v_sonuc jsonb;
begin
  if not exists (select 1 from private.yonetici where kullanici_id = (select auth.uid())) then
    raise exception 'Bu paneli yalnızca site yöneticisi görebilir.' using errcode = '42501';
  end if;

  v_bas := ((v_bugun - (v_gun - 1))::timestamp) at time zone 'Europe/Istanbul';

  with z as (
    select * from private.ziyaret where zaman >= v_bas
  ),
  ad as (
    select u.id,
           coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''),
                    nullif(u.raw_user_meta_data ->> 'name', ''),
                    p.profil_adi,
                    split_part(u.email, '@', 1)) as ad
    from auth.users u
    left join public.profil_verisi p on p.kullanici_id = u.id
  )
  select jsonb_build_object(
    'gun',          v_gun,
    'goruntuleme',  (select count(*) from z where olay = 'sayfa'),
    'tarif_acilma', (select count(*) from z where olay = 'tarif'),
    'pisirme',      (select count(*) from z where olay = 'pisirme'),
    'tekil',        (select count(distinct ziyaretci) from z),
    'oturum',       (select count(distinct oturum) from z),
    'giris_yapan',  (select count(distinct kullanici_id) from z),
    'simdi',        (select count(distinct ziyaretci) from private.ziyaret where zaman > now() - interval '5 minutes'),
    'kayitli',      (select count(*) from auth.users),
    'yeni_kayit',   (select count(*) from auth.users where created_at >= v_bas),

    'gunluk', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'gun', g.gun, 'goruntuleme', coalesce(x.goruntuleme, 0), 'tekil', coalesce(x.tekil, 0)
             ) order by g.gun), '[]'::jsonb)
      from (select (v_bugun - i) as gun from generate_series(0, v_gun - 1) i) g
      left join (
        select (zaman at time zone 'Europe/Istanbul')::date as gun,
               count(*) filter (where olay = 'sayfa') as goruntuleme,
               count(distinct ziyaretci) as tekil
        from z group by 1
      ) x on x.gun = g.gun
    ),

    'tarifler', (
      select coalesce(jsonb_agg(jsonb_build_object('anahtar', tarif, 'ad', ad, 'sayi', n) order by n desc), '[]'::jsonb)
      from (select tarif, max(tarif_ad) as ad, count(*) as n
            from z where olay = 'tarif' and tarif is not null
            group by tarif order by n desc limit 10) t
    ),

    'cihaz', (
      select coalesce(jsonb_agg(jsonb_build_object('ad', k, 'sayi', n) order by n desc), '[]'::jsonb)
      from (select coalesce(cihaz, 'bilinmiyor') k, count(distinct ziyaretci) n from z group by 1) t
    ),
    'tarayici', (
      select coalesce(jsonb_agg(jsonb_build_object('ad', k, 'sayi', n) order by n desc), '[]'::jsonb)
      from (select coalesce(tarayici, 'Diğer') k, count(distinct ziyaretci) n from z group by 1 order by 2 desc limit 6) t
    ),
    'sistem', (
      select coalesce(jsonb_agg(jsonb_build_object('ad', k, 'sayi', n) order by n desc), '[]'::jsonb)
      from (select coalesce(sistem, 'Diğer') k, count(distinct ziyaretci) n from z group by 1 order by 2 desc limit 6) t
    ),
    'bolge', (
      select coalesce(jsonb_agg(jsonb_build_object('ad', k, 'sayi', n) order by n desc), '[]'::jsonb)
      from (select coalesce(saat_dilimi, 'bilinmiyor') k, count(distinct ziyaretci) n from z group by 1 order by 2 desc limit 8) t
    ),
    'yonlendiren', (
      select coalesce(jsonb_agg(jsonb_build_object('ad', k, 'sayi', n) order by n desc), '[]'::jsonb)
      from (select coalesce(yonlendiren, 'Doğrudan') k, count(distinct oturum) n
            from z where olay = 'sayfa' group by 1 order by 2 desc limit 8) t
    ),

    'kullanicilar', (
      select coalesce(jsonb_agg(k order by k ->> 'son_aktif' desc nulls last, k ->> 'kayit' desc), '[]'::jsonb)
      from (
        select jsonb_build_object(
                 'ad',        a.ad,
                 'eposta',    u.email,
                 'saglayici', coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
                 'kayit',     u.created_at,
                 'son_giris', u.last_sign_in_at,
                 'son_aktif', s.son,
                 'ziyaret',   coalesce(s.n, 0),
                 'tarif',     coalesce(s.tarif, 0),
                 'yonetici',  exists (select 1 from private.yonetici y where y.kullanici_id = u.id)
               ) as k
        from auth.users u
        join ad a on a.id = u.id
        left join (
          select kullanici_id, max(zaman) as son, count(*) as n,
                 count(*) filter (where olay = 'tarif') as tarif
          from private.ziyaret where kullanici_id is not null group by 1
        ) s on s.kullanici_id = u.id
        limit 200
      ) t
    ),

    'son', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'zaman', r.zaman, 'olay', r.olay, 'tarif', r.tarif_ad, 'cihaz', r.cihaz,
               'tarayici', r.tarayici, 'sistem', r.sistem, 'bolge', r.saat_dilimi,
               'kullanici', a.ad, 'ziyaretci', left(r.ziyaretci, 6)
             ) order by r.zaman desc), '[]'::jsonb)
      from (select * from private.ziyaret order by zaman desc limit 30) r
      left join ad a on a.id = r.kullanici_id
    )
  ) into v_sonuc;

  return v_sonuc;
end;
$$;
revoke all on function public.yonetim_ozet(int) from public, anon;
grant execute on function public.yonetim_ozet(int) to authenticated;
