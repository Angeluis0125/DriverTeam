-- Los proyectos nuevos de Supabase no otorgan privilegios automáticos sobre tablas de public.
-- authenticated: el panel del chofer (RLS limita cada fila a su dueño).
-- service_role: flujos públicos del servidor (reserva sin cuenta, cron).
-- anon: sin acceso directo; las páginas públicas pasan por el servidor.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
revoke all on public.rate_limits from authenticated;

revoke execute on function public.income_report(date, date) from public, anon;
grant execute on function public.income_report(date, date) to authenticated, service_role;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;
