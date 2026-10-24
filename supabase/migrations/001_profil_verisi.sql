-- Her kullanıcının favori, not, malzeme, ayar gibi site verileri (tek satır, JSON)
create table public.profil_verisi (
  kullanici_id uuid primary key references auth.users(id) on delete cascade,
  profil_adi   text not null check (char_length(profil_adi) between 1 and 40),
  veri         jsonb not null default '{}'::jsonb,
  guncelleme   timestamptz not null default now()
);
alter table public.profil_verisi enable row level security;

-- Herkes yalnızca kendi satırını görür ve değiştirir
create policy "kendi verisini okur" on public.profil_verisi
  for select to authenticated using ((select auth.uid()) = kullanici_id);
create policy "kendi verisini ekler" on public.profil_verisi
  for insert to authenticated with check ((select auth.uid()) = kullanici_id);
create policy "kendi verisini günceller" on public.profil_verisi
  for update to authenticated using ((select auth.uid()) = kullanici_id) with check ((select auth.uid()) = kullanici_id);
create policy "kendi verisini siler" on public.profil_verisi
  for delete to authenticated using ((select auth.uid()) = kullanici_id);

-- veri boyutu sınırı (kötüye kullanımı önlemek için ~256 KB)
alter table public.profil_verisi add constraint veri_boyutu check (pg_column_size(veri) < 262144);
