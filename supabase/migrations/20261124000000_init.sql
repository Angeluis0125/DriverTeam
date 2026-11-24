-- DriverTeam: esquema inicial
create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- Tipos -----------------------------------------------------------------
create type booking_status as enum ('pending','confirmed','rejected','cancelled','completed','no_show');
create type payment_method as enum ('cash','card','terminal','transfer');

-- Choferes -----------------------------------------------------------------
create table public.drivers (
  id uuid primary key references auth.users(id) on delete cascade,
  slug text unique not null check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  full_name text not null,
  phone text,
  email text,
  bio text,
  photo_url text,
  vehicle text,
  currency text not null default 'MXN',
  timezone text not null default 'America/Mexico_City',
  auto_confirm boolean not null default false,
  buffer_minutes int not null default 15 check (buffer_minutes between 0 and 240),
  min_notice_hours int not null default 2 check (min_notice_hours between 0 and 168),
  max_days_ahead int not null default 30 check (max_days_ahead between 1 and 365),
  slot_step_minutes int not null default 30 check (slot_step_minutes in (15,30,60)),
  notify_email boolean not null default true,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.pricing (
  driver_id uuid primary key references public.drivers(id) on delete cascade,
  base numeric(10,2) not null default 0 check (base >= 0),
  per_km numeric(10,2) not null default 0 check (per_km >= 0),
  per_min numeric(10,2) not null default 0 check (per_min >= 0),
  minimum numeric(10,2) not null default 0 check (minimum >= 0)
);

create table public.payment_methods_accepted (
  driver_id uuid not null references public.drivers(id) on delete cascade,
  method payment_method not null,
  primary key (driver_id, method)
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);
create index on public.availability_rules (driver_id, weekday);

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  date date not null,
  is_blocked boolean not null default true, -- true: día bloqueado; false: horario especial
  start_time time,
  end_time time,
  note text,
  check (is_blocked or (start_time is not null and end_time is not null and end_time > start_time))
);
create index on public.availability_exceptions (driver_id, date);

-- Clientes -----------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  unique (driver_id, phone)
);

-- Reservas -----------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  pickup_address text not null,
  pickup_lat double precision,
  pickup_lng double precision,
  pickup_place_id text,
  dropoff_address text not null,
  dropoff_lat double precision,
  dropoff_lng double precision,
  dropoff_place_id text,
  start_at timestamptz not null,
  est_duration_min int not null check (est_duration_min > 0),
  est_distance_km numeric(10,2) not null check (est_distance_km >= 0),
  est_price numeric(10,2) not null check (est_price >= 0),
  discount_pct numeric(5,2) not null default 0,
  final_price numeric(10,2),
  passengers smallint not null default 1,
  status booking_status not null default 'pending',
  notes text,
  driver_notes text,
  manage_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  reminder_sent boolean not null default false,
  -- bloque ocupado = duración + buffer; se fija al crear para que cambios de buffer no rompan la restricción
  busy_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (busy_until > start_at)
);
create index on public.bookings (driver_id, start_at);
create index on public.bookings (customer_id);

-- Evita doble reserva: no puede haber dos reservas activas traslapadas del mismo chofer
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    driver_id with =,
    tstzrange(start_at, busy_until, '[)') with &&
  ) where (status in ('pending','confirmed'));

-- Pagos (solo registro) ----------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  amount numeric(10,2) not null check (amount >= 0),
  tip numeric(10,2) not null default 0 check (tip >= 0),
  method payment_method not null,
  paid_at timestamptz not null default now(),
  note text
);
create index on public.payments (driver_id, paid_at);
alter table public.payments add constraint payments_one_per_booking unique (booking_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  category text not null,
  amount numeric(10,2) not null check (amount >= 0),
  spent_on date not null default current_date,
  note text
);
create index on public.expenses (driver_id, spent_on);

-- Fidelización -------------------------------------------------------------
create table public.loyalty_programs (
  driver_id uuid primary key references public.drivers(id) on delete cascade,
  active boolean not null default false,
  trips_required int not null default 10 check (trips_required between 1 and 100),
  discount_pct numeric(5,2) not null default 10 check (discount_pct > 0 and discount_pct <= 100)
);

-- Avisos -------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (driver_id, created_at desc);

-- updated_at ---------------------------------------------------------------
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- RLS: cada chofer solo ve y edita lo suyo -------------------------------
alter table public.drivers enable row level security;
alter table public.pricing enable row level security;
alter table public.payment_methods_accepted enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.customers enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.loyalty_programs enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;

create policy own_driver on public.drivers for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['pricing','payment_methods_accepted','availability_rules','availability_exceptions',
    'customers','bookings','payments','expenses','loyalty_programs','push_subscriptions','notifications']
  loop
    execute format(
      'create policy own_rows on public.%I for all to authenticated using (driver_id = auth.uid()) with check (driver_id = auth.uid())', t);
  end loop;
end $$;

-- Tiempo real para avisos en el panel
alter publication supabase_realtime add table public.notifications;

-- Reportes -----------------------------------------------------------------
-- Ingresos agregados por día (zona horaria del chofer) y método
create function public.income_report(p_from date, p_to date)
returns table (day date, method payment_method, total numeric, tips numeric, trips bigint)
language sql stable security invoker as $$
  select (p.paid_at at time zone d.timezone)::date as day, p.method,
         sum(p.amount) as total, sum(p.tip) as tips, count(*) as trips
  from public.payments p
  join public.drivers d on d.id = p.driver_id
  where p.driver_id = auth.uid()
    and (p.paid_at at time zone d.timezone)::date between p_from and p_to
  group by 1, 2
  order by 1, 2;
$$;

-- Resumen por cliente (respeta RLS del usuario que consulta)
create view public.customer_stats with (security_invoker = true) as
  select c.id, c.driver_id, c.full_name, c.phone, c.email, c.notes, c.created_at,
         count(b.id) filter (where b.status = 'completed') as completed_trips,
         count(b.id) filter (where b.status in ('pending','confirmed')) as active_trips,
         coalesce(sum(p.amount + p.tip), 0) as total_paid,
         max(b.start_at) filter (where b.status = 'completed') as last_trip_at
  from public.customers c
  left join public.bookings b on b.customer_id = c.id
  left join public.payments p on p.booking_id = b.id
  group by c.id;
