-- Yeni hesap açılınca "hoş geldin" e-postası: auth.users'a eklenen her kullanıcı için hosgeldin Edge Function'ı çağrılır
create extension if not exists pg_net with schema extensions;

-- Kime gönderildiğini tutar (aynı kişiye iki kez gitmesin). Yalnızca sunucu (service role) erişir.
create table public.hosgeldin_kayit (
  kullanici_id uuid primary key references auth.users(id) on delete cascade,
  gonderildi   timestamptz not null default now()
);
alter table public.hosgeldin_kayit enable row level security;

create schema if not exists private;
create or replace function private.hosgeldin_tetik()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://zaaqcndfftcoavqponua.supabase.co/functions/v1/hosgeldin',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('id', new.id)
  );
  return new;
exception when others then
  return new;  -- e-posta gönderilemese bile kayıt bozulmasın
end;
$$;
revoke all on function private.hosgeldin_tetik() from public, anon, authenticated;

create trigger hosgeldin_epostasi
  after insert on auth.users
  for each row execute function private.hosgeldin_tetik();
