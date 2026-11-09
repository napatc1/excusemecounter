-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- It only ADDS new excuseme_* tables/functions; it doesn't touch anything else.
--
-- BEFORE RUNNING: replace YOUR_SECRET_WORD at the bottom with your secret word.
-- Don't commit the file with your real word in it.

create table if not exists public.excuseme_counter (
  id int primary key,
  value bigint not null default 0
);
insert into public.excuseme_counter (id, value) values (1, 0) on conflict (id) do nothing;
alter table public.excuseme_counter enable row level security;
drop policy if exists "anyone can read the counter" on public.excuseme_counter;
create policy "anyone can read the counter" on public.excuseme_counter
  for select to anon, authenticated using (true);

-- Holds only a hash of the secret word. No read policy, so the public can't see it.
create table if not exists public.excuseme_secret (
  id int primary key,
  word_hash text not null
);
alter table public.excuseme_secret enable row level security;
revoke all on public.excuseme_secret from anon, authenticated;

create or replace function public.excuseme_check(word text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.excuseme_secret
    where id = 1
      and word_hash = encode(sha256(convert_to(btrim(coalesce(word, '')), 'UTF8')), 'hex')
  );
$$;

create or replace function public.excuseme_press(word text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare new_value bigint;
begin
  if not public.excuseme_check(word) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update public.excuseme_counter set value = value + 1 where id = 1
    returning value into new_value;
  return new_value;
end;
$$;

revoke all on function public.excuseme_check(text) from public;
revoke all on function public.excuseme_press(text) from public;
grant execute on function public.excuseme_check(text) to anon, authenticated;
grant execute on function public.excuseme_press(text) to anon, authenticated;

-- Live updates for viewers
do $$ begin
  alter publication supabase_realtime add table public.excuseme_counter;
exception when duplicate_object then null;
end $$;

-- Set (or change) the secret word. Replace YOUR_SECRET_WORD:
insert into public.excuseme_secret (id, word_hash)
values (1, encode(sha256(convert_to('YOUR_SECRET_WORD', 'UTF8')), 'hex'))
on conflict (id) do update set word_hash = excluded.word_hash;
