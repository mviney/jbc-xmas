revoke all on function public.reserve_seats(text, text, integer, jsonb, text, text, text, jsonb, text)
  from public, anon, authenticated;

grant execute on function public.reserve_seats(text, text, integer, jsonb, text, text, text, jsonb, text)
  to service_role;