create extension if not exists pg_trgm with schema extensions;

create table if not exists public.members (
  id text primary key,
  name text not null,
  abf_number text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tables (
  table_number integer primary key check (table_number > 0),
  capacity integer not null check (capacity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.attendees (
  id uuid primary key default gen_random_uuid(),
  member_id text references public.members(id),
  name text not null,
  ticket_number text not null,
  table_number integer not null references public.tables(table_number),
  is_guest boolean not null default false,
  registered_by_attendee_id uuid references public.attendees(id),
  dietary_requirements jsonb not null default '[]'::jsonb,
  dietary_notes text not null default '',
  created_at timestamptz not null default now(),
  constraint attendee_name_length check (char_length(name) between 1 and 120),
  constraint attendee_ticket_length check (char_length(ticket_number) between 1 and 40),
  constraint attendee_dietary_notes_length check (char_length(dietary_notes) <= 100),
  constraint attendee_dietary_requirements_array check (jsonb_typeof(dietary_requirements) = 'array')
);

create unique index if not exists attendees_ticket_number_unique
  on public.attendees (lower(ticket_number));

create unique index if not exists attendees_one_registration_per_member
  on public.attendees (member_id)
  where member_id is not null and not is_guest;

create index if not exists members_name_trigram_idx
  on public.members using gin (name extensions.gin_trgm_ops);

insert into public.tables (table_number, capacity)
select generated_table.table_number, 12
from generate_series(1, 15) as generated_table(table_number)
on conflict (table_number) do nothing;

alter table public.members enable row level security;
alter table public.tables enable row level security;
alter table public.attendees enable row level security;

revoke all on public.members, public.tables, public.attendees from anon, authenticated;

create or replace function public.search_members(search_query text)
returns table (id text, name text, abf_number text)
language sql
stable
security definer
set search_path = ''
as $$
  select member.id, member.name, member.abf_number
  from public.members as member
  where member.active
    and char_length(btrim(search_query)) between 2 and 80
    and (
      member.name ilike '%' || btrim(search_query) || '%'
      or member.abf_number ilike '%' || btrim(search_query) || '%'
      or extensions.similarity(member.name, btrim(search_query)) >= 0.25
    )
  order by
    case when lower(member.abf_number) = lower(btrim(search_query)) then 0 else 1 end,
    greatest(
      extensions.similarity(member.name, btrim(search_query)),
      extensions.similarity(member.abf_number, btrim(search_query))
    ) desc,
    member.name
  limit 8;
$$;

create or replace function public.get_public_attendees()
returns table (id uuid, name text, table_number integer, is_guest boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select attendee.id, attendee.name, attendee.table_number, attendee.is_guest
  from public.attendees as attendee
  order by attendee.table_number, attendee.name;
$$;

create or replace function public.reserve_seats(
  p_member_id text,
  p_member_ticket_number text,
  p_table_number integer,
  p_dietary_requirements jsonb,
  p_dietary_notes text,
  p_guest_name text default null,
  p_guest_ticket_number text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_capacity integer;
  current_occupancy integer;
  member_attendee_id uuid;
  requested_seats integer;
  normalized_member_ticket text := btrim(p_member_ticket_number);
  normalized_guest_ticket text := btrim(coalesce(p_guest_ticket_number, ''));
  normalized_guest_name text := btrim(coalesce(p_guest_name, ''));
  normalized_notes text := btrim(coalesce(p_dietary_notes, ''));
  normalized_dietary jsonb := coalesce(p_dietary_requirements, '[]'::jsonb);
begin
  if p_member_id is null or normalized_member_ticket = '' then
    raise exception using message = 'invalid_reservation';
  end if;

  if not exists (select 1 from public.members where id = p_member_id and active) then
    raise exception using message = 'member_not_found';
  end if;

  if (normalized_guest_name = '') <> (normalized_guest_ticket = '') then
    raise exception using message = 'guest_details_required';
  end if;

  if char_length(normalized_notes) > 100
    or jsonb_typeof(normalized_dietary) is distinct from 'array' then
    raise exception using message = 'invalid_dietary_details';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(normalized_dietary) as requirement(value)
    where requirement.value is null
      or requirement.value not in ('Vegetarian', 'Nut-Free', 'Gluten-Free')
  ) then
    raise exception using message = 'invalid_dietary_details';
  end if;

  if normalized_guest_ticket <> '' and lower(normalized_member_ticket) = lower(normalized_guest_ticket) then
    raise exception using message = 'ticket_already_registered';
  end if;

  select event_table.capacity into target_capacity
  from public.tables as event_table
  where event_table.table_number = p_table_number
  for update;

  if target_capacity is null then
    raise exception using message = 'table_not_found';
  end if;

  if exists (
    select 1 from public.attendees
    where member_id = p_member_id and not is_guest
  ) then
    raise exception using message = 'member_already_registered';
  end if;

  if exists (
    select 1 from public.attendees
    where lower(ticket_number) = lower(normalized_member_ticket)
      or (normalized_guest_ticket <> '' and lower(ticket_number) = lower(normalized_guest_ticket))
  ) then
    raise exception using message = 'ticket_already_registered';
  end if;

  requested_seats := case when normalized_guest_ticket = '' then 1 else 2 end;
  select count(*)::integer into current_occupancy
  from public.attendees
  where table_number = p_table_number;

  if current_occupancy + requested_seats > target_capacity then
    raise exception using message = 'table_full';
  end if;

  insert into public.attendees (
    member_id, name, ticket_number, table_number, is_guest,
    dietary_requirements, dietary_notes
  )
  select member.id, member.name, normalized_member_ticket, p_table_number, false,
    normalized_dietary, normalized_notes
  from public.members as member
  where member.id = p_member_id
  returning id into member_attendee_id;

  if normalized_guest_ticket <> '' then
    insert into public.attendees (
      name, ticket_number, table_number, is_guest, registered_by_attendee_id
    ) values (
      normalized_guest_name, normalized_guest_ticket, p_table_number, true, member_attendee_id
    );
  end if;
end;
$$;

revoke all on function public.search_members(text) from public;
revoke all on function public.get_public_attendees() from public;
revoke all on function public.reserve_seats(text, text, integer, jsonb, text, text, text) from public;
grant execute on function public.search_members(text) to anon, authenticated;
grant execute on function public.get_public_attendees() to anon, authenticated;
grant execute on function public.reserve_seats(text, text, integer, jsonb, text, text, text) to anon, authenticated;