-- Wykonaj CAŁY plik w Supabase: SQL Editor -> New query -> Run.
create extension if not exists pgcrypto;

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text not null unique,
  content text not null,
  links jsonb not null default '[]'::jsonb,
  edit_token_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.letter_claims (
  device_id uuid primary key,
  letter_id uuid not null unique references public.letters(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.letters enable row level security;
alter table public.letter_claims enable row level security;
revoke all on public.letters from anon, authenticated;
revoke all on public.letter_claims from anon, authenticated;

create or replace function public.create_my_letter(
  p_name text, p_content text, p_links jsonb, p_edit_token text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.letters;
begin
  if length(trim(p_name)) < 2 or length(trim(p_name)) > 40 then raise exception 'Imię musi mieć od 2 do 40 znaków.'; end if;
  if length(trim(p_content)) < 1 or length(p_content) > 3000 then raise exception 'List musi mieć od 1 do 3000 znaków.'; end if;
  if jsonb_typeof(coalesce(p_links,'[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_links,'[]'::jsonb)) > 10 then raise exception 'Można dodać maksymalnie 10 linków.'; end if;
  insert into letters(name,name_key,content,links,edit_token_hash)
  values(trim(p_name),lower(trim(p_name)),p_content,coalesce(p_links,'[]'::jsonb),encode(digest(p_edit_token,'sha256'),'hex'))
  returning * into r;
  return jsonb_build_object('name',r.name,'content',r.content,'links',r.links);
exception when unique_violation then raise exception 'List dla tego imienia już istnieje.';
end $$;

create or replace function public.update_my_letter(
  p_name text, p_edit_token text, p_content text, p_links jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.letters;
begin
  update letters set content=p_content, links=coalesce(p_links,'[]'::jsonb), updated_at=now()
  where name_key=lower(trim(p_name)) and edit_token_hash=encode(digest(p_edit_token,'sha256'),'hex')
  returning * into r;
  if not found then raise exception 'Nieprawidłowy kod edycji.'; end if;
  return jsonb_build_object('name',r.name,'content',r.content,'links',r.links);
end $$;

create or replace function public.claim_and_get_letter(p_name text, p_device_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.letters; c public.letter_claims;
begin
  select * into r from letters where name_key=lower(trim(p_name));
  if not found then raise exception 'Nie znaleziono listu o takim imieniu.'; end if;
  select * into c from letter_claims where device_id=p_device_id;
  if found then
    if c.letter_id <> r.id then raise exception 'To urządzenie ma już przypisany inny list.'; end if;
  else
    insert into letter_claims(device_id,letter_id) values(p_device_id,r.id);
  end if;
  return jsonb_build_object('name',r.name,'content',r.content,'links',r.links);
exception when unique_violation then raise exception 'Ten list jest już przypisany do innego urządzenia.';
end $$;

create or replace function public.get_my_letter(p_name text, p_device_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.letters; c public.letter_claims;
begin
  select * into r from letters where name_key=lower(trim(p_name));
  if not found then raise exception 'Nie znaleziono listu.'; end if;
  select * into c from letter_claims where device_id=p_device_id and letter_id=r.id;
  if not found then raise exception 'To urządzenie nie ma dostępu do tego listu.'; end if;
  return jsonb_build_object('name',r.name,'content',r.content,'links',r.links);
end $$;

grant execute on function public.create_my_letter(text,text,jsonb,text) to anon, authenticated;
grant execute on function public.update_my_letter(text,text,text,jsonb) to anon, authenticated;
grant execute on function public.claim_and_get_letter(text,uuid) to anon, authenticated;
grant execute on function public.get_my_letter(text,uuid) to anon, authenticated;