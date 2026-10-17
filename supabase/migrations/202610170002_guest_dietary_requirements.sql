drop function if exists public.reserve_seats(text, text, integer, jsonb, text, text, text);

create function public.reserve_seats(
  p_member_id text,
  p_member_ticket_number text,
  p_table_number integer,
  p_dietary_requirements jsonb,
  p_dietary_notes text,
  p_guest_name text default null,
  p_guest_ticket_number text default null,
  p_guest_dietary_requirements jsonb default '[]'::jsonb,
  p_guest_dietary_notes text default ''
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
  normalized_guest_notes text := btrim(coalesce(p_guest_dietary_notes, ''));
  normalized_dietary jsonb := coalesce(p_dietary_requirements, '[]'::jsonb);
  normalized_guest_dietary jsonb := coalesce(p_guest_dietary_requirements, '[]'::jsonb);
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
    or char_length(normalized_guest_notes) > 100
    or jsonb_typeof(normalized_dietary) is distinct from 'array'
    or jsonb_typeof(normalized_guest_dietary) is distinct from 'array' then
    raise exception using message = 'invalid_dietary_details';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(normalized_dietary || normalized_guest_dietary) as requirement(value)
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
      name, ticket_number, table_number, is_guest, registered_by_attendee_id,
      dietary_requirements, dietary_notes
    ) values (
      normalized_guest_name, normalized_guest_ticket, p_table_number, true, member_attendee_id,
      normalized_guest_dietary, normalized_guest_notes
    );
  end if;
end;
$$;

revoke all on function public.reserve_seats(text, text, integer, jsonb, text, text, text, jsonb, text) from public;
grant execute on function public.reserve_seats(text, text, integer, jsonb, text, text, text, jsonb, text) to anon, authenticated;