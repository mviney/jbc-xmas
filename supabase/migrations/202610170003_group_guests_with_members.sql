drop function if exists public.get_public_attendees();

create function public.get_public_attendees()
returns table (
  id uuid,
  name text,
  table_number integer,
  is_guest boolean,
  registered_by_attendee_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    attendee.id,
    attendee.name,
    attendee.table_number,
    attendee.is_guest,
    attendee.registered_by_attendee_id
  from public.attendees as attendee
  order by
    attendee.table_number,
    coalesce(attendee.registered_by_attendee_id, attendee.id),
    attendee.is_guest,
    attendee.name;
$$;

revoke all on function public.get_public_attendees() from public;
grant execute on function public.get_public_attendees() to anon, authenticated;