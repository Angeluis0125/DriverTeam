-- Límite simple de peticiones para las APIs públicas (funciona en serverless)
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 1,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security; -- sin políticas: solo service role

create function public.hit_rate_limit(p_key text, p_window_seconds int, p_max int)
returns boolean language plpgsql security definer set search_path = public as $$
declare w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
declare n int;
begin
  insert into rate_limits(key, window_start) values (p_key, w)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into n;
  delete from rate_limits where window_start < now() - interval '1 day';
  return n <= p_max;
end $$;
revoke all on function public.hit_rate_limit(text,int,int) from public, anon, authenticated;
