-- Clima di casa: account, accesso e reset password. Incolla tutto nel SQL Editor di Supabase e premi Run.
create extension if not exists pgcrypto with schema extensions;

create table if not exists utenti (
  id bigserial primary key,
  nome text not null,
  telefono text not null,
  hash text not null,
  admin boolean not null default false,
  tentativi int not null default 0,
  bloccato boolean not null default false,
  blocco_fino timestamptz,
  creato timestamptz not null default now()
);
create unique index if not exists utenti_nome_u on utenti (lower(nome));
create table if not exists sessioni (
  token uuid primary key default gen_random_uuid(),
  utente bigint not null references utenti(id) on delete cascade,
  scade timestamptz not null
);
create table if not exists resets (
  utente bigint primary key references utenti(id) on delete cascade,
  codice text not null,
  scade timestamptz not null,
  tentativi int not null default 0
);
alter table utenti enable row level security;
alter table sessioni enable row level security;
alter table resets enable row level security;
revoke all on utenti, sessioni, resets from anon, authenticated;

create or replace function _tel(t text) returns text language sql immutable as $$ select regexp_replace(coalesce(t,''), '[^0-9+]', '', 'g') $$;

create or replace function _cod6() returns text language sql volatile set search_path = public, extensions as $$
  select lpad((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000)::text, 6, '0') $$;

create or replace function _adm(tok uuid) returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare r bigint;
begin
  select u.id into r from sessioni s join utenti u on u.id = s.utente
   where s.token = tok and s.scade > now() and u.admin and not u.bloccato;
  if r is null then raise exception 'non_autorizzato'; end if;
  return r;
end $$;

create or replace function elenco_nomi() returns setof text language sql security definer set search_path = public as $$
  select nome from utenti order by lower(nome) $$;

create or replace function accedi(p_nome text, p_pwd text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare u utenti; tok uuid; n int;
begin
  select * into u from utenti where lower(nome) = lower(coalesce(p_nome, ''));
  if not found then return json_build_object('errore', 'credenziali'); end if;
  if u.bloccato or (u.blocco_fino is not null and u.blocco_fino > now()) then return json_build_object('errore', 'bloccato'); end if;
  if crypt(coalesce(p_pwd, ''), u.hash) = u.hash then
    update utenti set tentativi = 0, blocco_fino = null where id = u.id;
    insert into sessioni (utente, scade) values (u.id, now() + interval '30 days') returning token into tok;
    return json_build_object('token', tok, 'nome', u.nome, 'admin', u.admin);
  end if;
  n := u.tentativi + 1;
  if n >= 5 then
    if u.admin then update utenti set tentativi = 0, blocco_fino = now() + interval '15 minutes' where id = u.id;
    else update utenti set tentativi = n, bloccato = true where id = u.id; end if;
    return json_build_object('errore', 'bloccato');
  end if;
  update utenti set tentativi = n where id = u.id;
  return json_build_object('errore', 'credenziali', 'restanti', 5 - n);
end $$;

create or replace function sessione(tok uuid) returns json language sql security definer set search_path = public as $$
  select json_build_object('nome', u.nome, 'admin', u.admin) from sessioni s join utenti u on u.id = s.utente
   where s.token = tok and s.scade > now() and not u.bloccato $$;

create or replace function esci(tok uuid) returns void language sql security definer set search_path = public as $$
  delete from sessioni where token = tok $$;

create or replace function cambia_password(tok uuid, vecchia text, nuova text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare u utenti;
begin
  select x.* into u from sessioni s join utenti x on x.id = s.utente where s.token = tok and s.scade > now();
  if not found then return json_build_object('errore', 'sessione'); end if;
  if nuova !~ '^[0-9]{6}$' then return json_build_object('errore', 'formato'); end if;
  if crypt(coalesce(vecchia, ''), u.hash) <> u.hash then return json_build_object('errore', 'vecchia'); end if;
  update utenti set hash = crypt(nuova, gen_salt('bf')) where id = u.id;
  return json_build_object('ok', true);
end $$;

create or replace function admin_elenco(tok uuid) returns json language plpgsql security definer set search_path = public as $$
declare r json;
begin
  perform _adm(tok);
  select coalesce(json_agg(json_build_object('id', u.id, 'nome', u.nome, 'telefono', u.telefono, 'admin', u.admin,
         'bloccato', u.bloccato or (u.blocco_fino is not null and u.blocco_fino > now()), 'tentativi', u.tentativi,
         'codice', case when r.scade > now() then r.codice end) order by lower(u.nome)), '[]'::json)
    into r from utenti u left join resets r on r.utente = u.id;
  return r;
end $$;

create or replace function admin_crea(tok uuid, p_nome text, p_pwd text, p_tel text) returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _adm(tok);
  p_nome := btrim(coalesce(p_nome, '')); p_tel := _tel(p_tel);
  if char_length(p_nome) < 2 or char_length(p_nome) > 30 then return json_build_object('errore', 'nome'); end if;
  if p_pwd !~ '^[0-9]{6}$' then return json_build_object('errore', 'password'); end if;
  if p_tel !~ '^\+[0-9]{8,15}$' then return json_build_object('errore', 'telefono'); end if;
  insert into utenti (nome, telefono, hash) values (p_nome, p_tel, crypt(p_pwd, gen_salt('bf')));
  return json_build_object('ok', true);
exception when unique_violation then return json_build_object('errore', 'esistente');
end $$;

create or replace function admin_sblocca(tok uuid, p_id bigint) returns json language plpgsql security definer set search_path = public as $$
begin
  perform _adm(tok);
  update utenti set tentativi = 0, bloccato = false, blocco_fino = null where id = p_id;
  return json_build_object('ok', true);
end $$;

create or replace function admin_nuova_password(tok uuid, p_id bigint) returns json language plpgsql security definer set search_path = public, extensions as $$
declare c text;
begin
  perform _adm(tok);
  c := _cod6();
  update utenti set hash = crypt(c, gen_salt('bf')), tentativi = 0, bloccato = false, blocco_fino = null where id = p_id;
  if not found then return json_build_object('errore', 'utente'); end if;
  delete from sessioni where utente = p_id and token <> tok;
  return json_build_object('password', c);
end $$;

create or replace function admin_telefono(tok uuid, p_id bigint, p_tel text) returns json language plpgsql security definer set search_path = public as $$
begin
  perform _adm(tok);
  p_tel := _tel(p_tel);
  if p_tel !~ '^\+[0-9]{8,15}$' then return json_build_object('errore', 'telefono'); end if;
  update utenti set telefono = p_tel where id = p_id;
  return json_build_object('ok', true);
end $$;

create or replace function admin_elimina(tok uuid, p_id bigint) returns json language plpgsql security definer set search_path = public as $$
declare me bigint;
begin
  me := _adm(tok);
  if me = p_id then return json_build_object('errore', 'se_stesso'); end if;
  delete from utenti where id = p_id;
  return json_build_object('ok', true);
end $$;

-- Reset: risponde sempre allo stesso modo, così nessuno scopre chi è registrato.
create or replace function reset_richiedi(p_nome text, p_tel text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare u utenti;
begin
  select * into u from utenti where lower(nome) = lower(coalesce(p_nome, '')) and telefono = _tel(p_tel) and not admin and not bloccato;
  if found then
    insert into resets (utente, codice, scade, tentativi) values (u.id, _cod6(), now() + interval '10 minutes', 0)
    on conflict (utente) do update set codice = excluded.codice, scade = excluded.scade, tentativi = 0;
  end if;
  return json_build_object('ok', true);
end $$;

create or replace function reset_conferma(p_nome text, p_tel text, p_codice text, p_nuova text) returns json language plpgsql security definer set search_path = public, extensions as $$
declare u utenti; r resets;
begin
  if p_nuova !~ '^[0-9]{6}$' then return json_build_object('errore', 'formato'); end if;
  select * into u from utenti where lower(nome) = lower(coalesce(p_nome, '')) and telefono = _tel(p_tel) and not admin;
  if not found then return json_build_object('errore', 'codice'); end if;
  select * into r from resets where utente = u.id and scade > now() and tentativi < 5;
  if not found then return json_build_object('errore', 'codice'); end if;
  if r.codice <> btrim(coalesce(p_codice, '')) then
    update resets set tentativi = tentativi + 1 where utente = u.id;
    return json_build_object('errore', 'codice');
  end if;
  update utenti set hash = crypt(p_nuova, gen_salt('bf')), tentativi = 0, bloccato = false, blocco_fino = null where id = u.id;
  delete from resets where utente = u.id;
  delete from sessioni where utente = u.id;
  return json_build_object('ok', true);
end $$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function elenco_nomi(), accedi(text, text), sessione(uuid), esci(uuid), cambia_password(uuid, text, text),
  admin_elenco(uuid), admin_crea(uuid, text, text, text), admin_sblocca(uuid, bigint), admin_nuova_password(uuid, bigint),
  admin_telefono(uuid, bigint, text), admin_elimina(uuid, bigint), reset_richiedi(text, text), reset_conferma(text, text, text, text)
  to anon, authenticated;
