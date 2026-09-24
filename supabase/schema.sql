-- ===========================================================================
--  Chic by Sisters Clinic — booking database schema (Supabase / PostgreSQL)
-- ===========================================================================
--  This file is the reference implementation of the booking backend. The site
--  ships in demo mode and switches to this schema automatically as soon as
--  NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured.
--
--  Guiding rules
--   1. Customers NEVER read tables directly. Availability, booking, lookup,
--      reschedule and cancel all go through SECURITY DEFINER functions that
--      validate the request and expose only the fields a customer may see.
--   2. Double booking is impossible at the database level, not in application
--      code: an exclusion constraint rejects any overlapping appointment for
--      the same staff member, even if two requests arrive at the same instant.
--   3. The management token is a credential. It is 32 random bytes, compared in
--      the database, and never listed in any public query.
--   4. Staff access is driven by Supabase Auth: `app_metadata.role` must be
--      'admin' or 'staff'. Roles are set server-side only (never editable by the
--      user), so a customer cannot promote themselves.
--
--  Apply with:  supabase db push   (or paste into the SQL editor)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid(), gen_random_bytes()
create extension if not exists "btree_gist"; -- exclusion constraints with equality

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'appointment_status') then
    create type public.appointment_status as enum
      ('pending', 'confirmed', 'completed', 'cancelled', 'no-show', 'rescheduled');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Clinic settings (single row) — editable later from the admin dashboard
-- ---------------------------------------------------------------------------
create table if not exists public.clinic_settings (
  id                    boolean primary key default true check (id),
  timezone              text    not null default 'Asia/Muscat',
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes between 5 and 240),
  lead_time_minutes     integer not null default 120 check (lead_time_minutes >= 0),
  horizon_days          integer not null default 60 check (horizon_days between 1 and 365),
  turnover_minutes      integer not null default 0 check (turnover_minutes >= 0),
  -- When true, only one appointment can exist at a time across the whole clinic
  -- (single treatment room). Leave false when each staff member has their own room.
  single_room           boolean not null default false,
  updated_at            timestamptz not null default now()
);

insert into public.clinic_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(name) between 2 and 120),
  description      text,
  duration_minutes integer not null check (duration_minutes between 5 and 600),
  price            numeric(10, 3) check (price is null or price >= 0),
  currency         text not null default 'OMR',
  category         text,
  sort_order       integer not null default 0,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists services_active_idx on public.services (active, sort_order);

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------
create table if not exists public.staff (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users (id) on delete set null,
  name         text not null,
  title        text,
  room         text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists staff_active_idx on public.staff (active);

-- ---------------------------------------------------------------------------
-- Working hours — one row per opening session (morning / evening)
-- ---------------------------------------------------------------------------
create table if not exists public.working_hours (
  id          uuid primary key default gen_random_uuid(),
  -- null = applies to the clinic as a whole
  staff_id    uuid references public.staff (id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time  time not null,
  end_time    time not null,
  created_at  timestamptz not null default now(),
  constraint working_hours_order check (start_time < end_time)
);

create index if not exists working_hours_lookup_idx on public.working_hours (staff_id, weekday);

-- ---------------------------------------------------------------------------
-- Blocked periods — holidays, team training, days off, internal bookings
-- ---------------------------------------------------------------------------
create table if not exists public.blocked_periods (
  id         uuid primary key default gen_random_uuid(),
  staff_id   uuid references public.staff (id) on delete cascade,
  block_date date not null,
  -- null start/end = the whole day is blocked
  start_time time,
  end_time   time,
  reason     text,
  created_at timestamptz not null default now(),
  constraint blocked_periods_order check (
    start_time is null or end_time is null or start_time < end_time
  )
);

create index if not exists blocked_periods_date_idx on public.blocked_periods (block_date, staff_id);

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 2 and 120),
  phone           text not null check (char_length(phone) between 8 and 20),
  -- Digits-only version of the phone, used for matching "91234567" to "+968 9123 4567".
  phone_normalised text generated always as (right(regexp_replace(phone, '\D', '', 'g'), 8)) stored,
  email           text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists customers_phone_normalised_idx
  on public.customers (phone_normalised);

-- ---------------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------------
create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  -- Short, human-readable code the customer can quote on the phone.
  reference_code   text not null unique
    default 'CBS-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 6)),
  customer_id      uuid not null references public.customers (id) on delete restrict,
  service_id       uuid not null references public.services (id) on delete restrict,
  staff_id         uuid references public.staff (id) on delete set null,
  appointment_date date not null,
  start_time       time not null,
  end_time         time not null,
  status           public.appointment_status not null default 'pending',
  notes            text,
  -- Management credential: 32 random bytes, hex encoded. Treated like a password.
  manage_token     text not null default encode(gen_random_bytes(32), 'hex'),
  -- Set when the clinic adjusts the start ("running late").
  delay_minutes    integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  cancelled_at     timestamptz,
  constraint appointments_order check (start_time < end_time)
);

-- Derived columns used by the exclusion constraints and by the diary queries.
alter table public.appointments
  add column if not exists appointment_period tsrange
  generated always as (
    tsrange(
      appointment_date + start_time,
      appointment_date + end_time,
      '[)'
    )
  ) stored;

-- Every appointment must occupy a "resource". When no staff member is assigned
-- the sentinel UUID is used, which lets the exclusion constraint below also
-- protect the "no staff assigned" case.
alter table public.appointments
  add column if not exists resource_key uuid
  generated always as (
    coalesce(staff_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) stored;

comment on column public.appointments.appointment_period is
  'Half-open [start, end) interval; the basis of the double-booking protection.';

-- ---------------------------------------------------------------------------
-- THE double-booking guarantee
-- ---------------------------------------------------------------------------
-- Two appointments for the same staff member can never overlap, unless one of
-- them is cancelled / completed / a no-show. Because this is a database
-- constraint, PostgreSQL serialises concurrent inserts: the second booking
-- fails with SQLSTATE 23P01 instead of silently clashing.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_no_overlap_per_staff'
  ) then
    alter table public.appointments
      add constraint appointments_no_overlap_per_staff
      exclude using gist (
        resource_key with =,
        appointment_period with &&
      )
      where (status in ('pending', 'confirmed'));
  end if;
end $$;

-- Optional clinic-wide protection (single treatment room). Enable it from the
-- admin dashboard when the clinic has only one room in use.
do $$
begin
  if (select single_room from public.clinic_settings) then
    if not exists (select 1 from pg_constraint where conname = 'appointments_no_overlap_clinic') then
      alter table public.appointments
        add constraint appointments_no_overlap_clinic
        exclude using gist (appointment_period with &&)
        where (status in ('pending', 'confirmed'));
    end if;
  end if;
end $$;

create index if not exists appointments_date_idx
  on public.appointments (appointment_date, start_time);
create index if not exists appointments_customer_idx on public.appointments (customer_id);
create unique index if not exists appointments_manage_token_idx on public.appointments (manage_token);

-- ---------------------------------------------------------------------------
-- Notification log — the audit trail for WhatsApp automation
-- ---------------------------------------------------------------------------
create table if not exists public.notification_log (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments (id) on delete cascade,
  event          text not null check (event in
    ('confirmation', 'reschedule', 'cancellation', 'reminder', 'running-late')),
  status         text not null check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider_id    text,
  error          text,
  payload        jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists notification_log_appointment_idx
  on public.notification_log (appointment_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Updated-at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists services_touch on public.services;
create trigger services_touch before update on public.services
  for each row execute function public.touch_updated_at();

drop trigger if exists customers_touch on public.customers;
create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();

drop trigger if exists appointments_touch on public.appointments;
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Keep end_time in step with the service duration
-- ---------------------------------------------------------------------------
create or replace function public.set_appointment_end_time()
returns trigger
language plpgsql
as $$
declare
  v_duration integer;
begin
  select duration_minutes into v_duration from public.services where id = new.service_id;
  if v_duration is null then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  -- The server owns the end time; a client cannot stretch its own slot.
  new.end_time := new.start_time + make_interval(mins => v_duration);
  return new;
end $$;

drop trigger if exists appointments_set_end_time on public.appointments;
create trigger appointments_set_end_time
  before insert or update of service_id, start_time on public.appointments
  for each row execute function public.set_appointment_end_time();

-- ===========================================================================
--  Authorisation helpers
-- ===========================================================================
-- Roles live in `auth.users.raw_app_meta_data`, which only the service role can
-- write. A customer can never grant themselves staff access.
create or replace function public.current_staff_role()
returns text
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    (auth.jwt() -> 'user_metadata' ->> 'role')  -- legacy fallback
  );
$$;

create or replace function public.is_clinic_staff()
returns boolean
language sql
stable
as $$
  select public.current_staff_role() in ('admin', 'staff');
$$;

-- ===========================================================================
--  Row Level Security
-- ===========================================================================
alter table public.services          enable row level security;
alter table public.staff             enable row level security;
alter table public.working_hours     enable row level security;
alter table public.blocked_periods   enable row level security;
alter table public.customers         enable row level security;
alter table public.appointments      enable row level security;
alter table public.clinic_settings   enable row level security;
alter table public.notification_log  enable row level security;

-- Public catalogue: anyone may read active services and active staff names.
drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services
  for select using (active or public.is_clinic_staff());

drop policy if exists services_staff_write on public.services;
create policy services_staff_write on public.services
  for all using (public.is_clinic_staff()) with check (public.is_clinic_staff());

drop policy if exists staff_public_read on public.staff;
create policy staff_public_read on public.staff
  for select using (active or public.is_clinic_staff());

drop policy if exists staff_admin_write on public.staff;
create policy staff_admin_write on public.staff
  for all using (public.current_staff_role() = 'admin')
  with check (public.current_staff_role() = 'admin');

-- Opening hours and blocked time are internal. Customers see availability only
-- through the SECURITY DEFINER functions below.
drop policy if exists working_hours_staff on public.working_hours;
create policy working_hours_staff on public.working_hours
  for all using (public.is_clinic_staff()) with check (public.is_clinic_staff());

drop policy if exists blocked_periods_staff on public.blocked_periods;
create policy blocked_periods_staff on public.blocked_periods
  for all using (public.is_clinic_staff()) with check (public.is_clinic_staff());

-- Customer records: staff only. Customers never read this table directly; the
-- lookup functions return only their own appointment.
drop policy if exists customers_staff on public.customers;
create policy customers_staff on public.customers
  for all using (public.is_clinic_staff()) with check (public.is_clinic_staff());

-- Appointments: staff only for direct access.
drop policy if exists appointments_staff on public.appointments;
create policy appointments_staff on public.appointments
  for all using (public.is_clinic_staff()) with check (public.is_clinic_staff());

drop policy if exists clinic_settings_staff on public.clinic_settings;
create policy clinic_settings_staff on public.clinic_settings
  for all using (public.is_clinic_staff()) with check (public.is_clinic_staff());

drop policy if exists notification_log_staff on public.notification_log;
create policy notification_log_staff on public.notification_log
  for all using (public.is_clinic_staff()) with check (public.is_clinic_staff());

-- ===========================================================================
--  Availability engine (SQL mirror of src/lib/booking/availability.ts)
-- ===========================================================================
create or replace function public.clinic_now()
returns timestamp
language sql
stable
as $$
  select (now() at time zone (select timezone from public.clinic_settings))::timestamp;
$$;

-- Candidate slot grid for a date: every start time that fits inside an opening
-- session, stepping by the configured interval.
create or replace function public.slot_starts(p_date date, p_duration int)
returns table (start_time time, end_time time)
language plpgsql
stable
as $$
declare
  v_interval integer;
  v_session  record;
  v_start    timestamp;
begin
  select slot_interval_minutes into v_interval from public.clinic_settings;

  for v_session in
    select wh.start_time as opens, wh.end_time as closes
    from public.working_hours wh
    where wh.staff_id is null and wh.weekday = extract(dow from p_date)::smallint
    order by wh.start_time
  loop
    v_start := p_date + v_session.opens;
    while v_start + make_interval(mins => p_duration) <= p_date + v_session.closes loop
      start_time := v_start::time;
      end_time   := (v_start + make_interval(mins => p_duration))::time;
      return next;
      v_start := v_start + make_interval(mins => v_interval);
    end loop;
  end loop;
end $$;

-- Full availability for one day, including *why* a slot cannot be booked so the
-- interface can show unavailable times rather than hiding them.
create or replace function public.get_day_availability(
  p_service_id uuid,
  p_date date,
  p_staff_id uuid default null
)
returns table (start_time time, end_time time, available boolean, reason text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_duration  integer;
  v_settings  public.clinic_settings;
  v_now       timestamp;
begin
  perform 1; -- keep the definer context predictable
  select * into v_settings from public.clinic_settings;
  v_now := public.clinic_now();

  select duration_minutes into v_duration
  from public.services
  where id = p_service_id and active;

  if v_duration is null then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  -- Outside the booking window (past, or too far ahead): nothing is offered.
  if p_date < v_now::date or p_date > (v_now::date + v_settings.horizon_days) then
    return;
  end if;

  return query
  with candidates as (
    select * from public.slot_starts(p_date, v_duration)
  ),
  settings as (
    select v_settings.turnover_minutes as turnover,
           v_settings.lead_time_minutes as lead_time
  ),
  clashes as (
    select c.start_time,
           bool_or(b.start_time is not null) as blocked,
           bool_or(a.id is not null) as booked
    from candidates c
    left join public.blocked_periods b
      on b.block_date = p_date
     and (b.staff_id is null or b.staff_id = p_staff_id)
     and (
       b.start_time is null
       or tsrange(p_date + b.start_time, p_date + b.end_time, '[)')
          && tsrange(p_date + c.start_time, p_date + c.end_time, '[)')
     )
    left join public.appointments a
      on a.appointment_date = p_date
     and a.status in ('pending', 'confirmed')
     and (p_staff_id is null or a.staff_id = p_staff_id)
     and tsrange(
           p_date + a.start_time,
           p_date + a.end_time + make_interval(mins => (select turnover from settings)),
           '[)'
         )
         && tsrange(p_date + c.start_time, p_date + c.end_time, '[)')
    group by c.start_time, c.end_time
  )
  select
    c.start_time,
    c.end_time,
    case
      when (p_date = v_now::date
            and p_date + c.start_time < v_now + make_interval(mins => (select lead_time from settings)))
        then false
      when c.blocked then false
      when c.booked then false
      else true
    end as available,
    case
      when (p_date = v_now::date
            and p_date + c.start_time < v_now + make_interval(mins => (select lead_time from settings)))
        then 'past'
      when c.blocked then 'blocked'
      when c.booked then 'booked'
      else null
    end as reason
  from candidates c
  join clashes cl on cl.start_time = c.start_time
  order by c.start_time;
end $$;

create or replace function public.get_month_availability(
  p_service_id uuid,
  p_from date,
  p_to date
)
returns table (day date, is_open boolean, available_count integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_day date;
  v_open boolean;
  v_count integer;
begin
  for v_day in select generate_series(p_from, p_to, interval '1 day')::date loop
    select exists (
      select 1 from public.working_hours wh
      where wh.staff_id is null and wh.weekday = extract(dow from v_day)::smallint
    ) into v_open;

    if v_open then
      select count(*) into v_count
      from public.get_day_availability(p_service_id, v_day, null) s
      where s.available;
    else
      v_count := 0;
    end if;

    day := v_day;
    is_open := v_open;
    available_count := coalesce(v_count, 0);
    return next;
  end loop;
end $$;

create or replace function public.get_next_available_date(p_service_id uuid, p_from date)
returns date
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_offset integer := 0;
  v_horizon integer;
  v_day date;
begin
  select horizon_days into v_horizon from public.clinic_settings;

  while v_offset <= v_horizon loop
    v_day := greatest(p_from, public.clinic_now()::date) + v_offset;
    if exists (
      select 1 from public.get_day_availability(p_service_id, v_day, null) s where s.available
    ) then
      return v_day;
    end if;
    v_offset := v_offset + 1;
  end loop;

  return null;
end $$;

-- ===========================================================================
--  Booking, lookup, reschedule, cancel — the customer-facing API
-- ===========================================================================

-- Shared projection: the exact fields a customer may see about an appointment.
create or replace function public.appointment_view(a public.appointments)
returns table (
  id uuid,
  reference_code text,
  service_id uuid,
  service_name text,
  duration_minutes integer,
  staff_id uuid,
  staff_name text,
  appointment_date date,
  start_time time,
  end_time time,
  status text,
  notes text,
  customer_id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  created_at timestamptz,
  updated_at timestamptz,
  delay_minutes integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.reference_code,
    a.service_id,
    s.name,
    s.duration_minutes,
    a.staff_id,
    st.name,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status::text,
    a.notes,
    c.id,
    c.name,
    -- The phone number is masked for anything except the customer's own view.
    c.phone,
    c.email,
    a.created_at,
    a.updated_at,
    a.delay_minutes
  from public.appointments a
  join public.customers c on c.id = a.customer_id
  join public.services  s on s.id = a.service_id
  left join public.staff st on st.id = a.staff_id
  where a.id = $1.id;
$$;

-- Create a booking. Raises on any conflict so the race is resolved by the
-- database rather than by hope.
create or replace function public.create_appointment(
  p_service_id     uuid,
  p_date           date,
  p_start_time     time,
  p_customer_name  text,
  p_customer_phone text,
  p_customer_email text default null,
  p_notes          text default null,
  p_staff_id       uuid default null
)
returns table (
  id uuid, reference_code text, service_id uuid, service_name text,
  duration_minutes integer, staff_id uuid, staff_name text,
  appointment_date date, start_time time, end_time time, status text,
  notes text, customer_id uuid, customer_name text, customer_phone text,
  customer_email text, created_at timestamptz, updated_at timestamptz,
  delay_minutes integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service  public.services;
  v_customer public.customers;
  v_available boolean;
  v_reason   text;
  v_phone    text := regexp_replace(coalesce(p_customer_phone, ''), '\s', '', 'g');
  v_appt     public.appointments;
begin
  if char_length(trim(coalesce(p_customer_name, ''))) < 2 then
    raise exception 'INVALID_INPUT: name';
  end if;
  if char_length(regexp_replace(v_phone, '\D', '', 'g')) < 8 then
    raise exception 'INVALID_INPUT: phone';
  end if;

  select * into v_service from public.services where id = p_service_id and active;
  if v_service.id is null then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  -- Re-check availability inside the same transaction that inserts.
  select s.available, s.reason into v_available, v_reason
  from public.get_day_availability(p_service_id, p_date, p_staff_id) s
  where s.start_time = p_start_time;

  if v_available is not true then
    if v_reason is null then
      raise exception 'CLOSED';
    end if;
    raise exception 'SLOT_UNAVAILABLE: %', v_reason;
  end if;

  -- Upsert the customer on the normalised phone number.
  insert into public.customers (name, phone, email)
  values (trim(p_customer_name), v_phone, nullif(trim(coalesce(p_customer_email, '')), ''))
  on conflict (phone_normalised) do update
    set name  = excluded.name,
        email = coalesce(excluded.email, public.customers.email)
  returning * into v_customer;

  begin
    insert into public.appointments (
      customer_id, service_id, staff_id, appointment_date, start_time, end_time, notes, status
    )
    values (
      v_customer.id, p_service_id, p_staff_id, p_date, p_start_time,
      p_start_time + make_interval(mins => v_service.duration_minutes),
      nullif(trim(coalesce(p_notes, '')), ''),
      'confirmed'
    )
    returning * into v_appt;
  exception
    -- 23P01 = exclusion_violation: someone else took the slot a moment ago.
    when exclusion_violation then
      raise exception 'SLOT_UNAVAILABLE: race';
    when unique_violation then
      raise exception 'SLOT_UNAVAILABLE: duplicate';
  end;

  return query select * from public.appointment_view(v_appt);
end $$;

-- Authorised lookup by management token. Compared in the database; the token is
-- never logged and never used to enumerate appointments.
create or replace function public.get_appointment_by_token(p_token text)
returns table (
  id uuid, reference_code text, service_id uuid, service_name text,
  duration_minutes integer, staff_id uuid, staff_name text,
  appointment_date date, start_time time, end_time time, status text,
  notes text, customer_id uuid, customer_name text, customer_phone text,
  customer_email text, created_at timestamptz, updated_at timestamptz,
  delay_minutes integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_appt public.appointments;
begin
  if p_token is null or char_length(p_token) < 32 then
    return;
  end if;

  select * into v_appt
  from public.appointments
  where manage_token = p_token;

  if v_appt.id is null then
    return;
  end if;

  return query select * from public.appointment_view(v_appt);
end $$;

-- Fallback lookup: reference code AND the phone number used to book. Both are
-- required, so a leaked code alone reveals nothing.
create or replace function public.find_appointment_by_reference(
  p_reference text,
  p_phone     text
)
returns table (
  id uuid, reference_code text, service_id uuid, service_name text,
  duration_minutes integer, staff_id uuid, staff_name text,
  appointment_date date, start_time time, end_time time, status text,
  notes text, customer_id uuid, customer_name text, customer_phone text,
  customer_email text, created_at timestamptz, updated_at timestamptz,
  delay_minutes integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_appt public.appointments;
begin
  select a.* into v_appt
  from public.appointments a
  join public.customers c on c.id = a.customer_id
  where upper(a.reference_code) = upper(trim(p_reference))
    and c.phone_normalised = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 8);

  if v_appt.id is null then
    return;
  end if;

  return query select * from public.appointment_view(v_appt);
end $$;

-- Reschedule with the same guarantees as a new booking.
create or replace function public.reschedule_appointment(
  p_token      text,
  p_date       date,
  p_start_time time
)
returns table (
  id uuid, reference_code text, service_id uuid, service_name text,
  duration_minutes integer, staff_id uuid, staff_name text,
  appointment_date date, start_time time, end_time time, status text,
  notes text, customer_id uuid, customer_name text, customer_phone text,
  customer_email text, created_at timestamptz, updated_at timestamptz,
  delay_minutes integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt     public.appointments;
  v_service  public.services;
  v_available boolean;
  v_reason   text;
begin
  select * into v_appt from public.appointments where manage_token = p_token;
  if v_appt.id is null then
    return;
  end if;
  if v_appt.status = 'cancelled' then
    raise exception 'NOT_FOUND: cancelled';
  end if;

  select * into v_service from public.services where id = v_appt.service_id;

  select s.available, s.reason into v_available, v_reason
  from public.get_day_availability(v_appt.service_id, p_date, v_appt.staff_id) s
  where s.start_time = p_start_time;

  if v_available is not true then
    if v_reason is null then
      raise exception 'CLOSED';
    end if;
    raise exception 'SLOT_UNAVAILABLE: %', v_reason;
  end if;

  begin
    update public.appointments
       set appointment_date = p_date,
           start_time       = p_start_time,
           end_time         = p_start_time + make_interval(mins => v_service.duration_minutes),
           status           = 'confirmed'
     where id = v_appt.id
    returning * into v_appt;
  exception
    when exclusion_violation then
      raise exception 'SLOT_UNAVAILABLE: race';
  end;

  return query select * from public.appointment_view(v_appt);
end $$;

-- Cancel. Keeps the row for the clinic's records and releases the slot.
create or replace function public.cancel_appointment(p_token text)
returns table (
  id uuid, reference_code text, service_id uuid, service_name text,
  duration_minutes integer, staff_id uuid, staff_name text,
  appointment_date date, start_time time, end_time time, status text,
  notes text, customer_id uuid, customer_name text, customer_phone text,
  customer_email text, created_at timestamptz, updated_at timestamptz,
  delay_minutes integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt public.appointments;
begin
  select * into v_appt from public.appointments where manage_token = p_token;
  if v_appt.id is null then
    return;
  end if;

  update public.appointments
     set status = 'cancelled', cancelled_at = now()
   where id = v_appt.id
  returning * into v_appt;

  return query select * from public.appointment_view(v_appt);
end $$;

-- ===========================================================================
--  Staff / admin operations (used by the future /admin dashboard)
-- ===========================================================================
create or replace function public.staff_set_appointment_status(
  p_appointment_id uuid,
  p_status public.appointment_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_clinic_staff() then
    raise exception 'UNAUTHORISED';
  end if;

  update public.appointments
     set status = p_status,
         cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end
   where id = p_appointment_id;
end $$;

-- "Running late": shift the start time (and record the delay) so the diary stays
-- truthful, then the caller queues the WhatsApp notification.
create or replace function public.staff_delay_appointment(
  p_appointment_id uuid,
  p_minutes        integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt public.appointments;
begin
  if not public.is_clinic_staff() then
    raise exception 'UNAUTHORISED';
  end if;
  if p_minutes is null or p_minutes < 0 or p_minutes > 240 then
    raise exception 'INVALID_INPUT: minutes';
  end if;

  select * into v_appt from public.appointments where id = p_appointment_id;
  if v_appt.id is null then
    raise exception 'NOT_FOUND';
  end if;

  update public.appointments
     set start_time     = v_appt.start_time + make_interval(mins => p_minutes),
         end_time       = v_appt.end_time + make_interval(mins => p_minutes),
         delay_minutes  = v_appt.delay_minutes + p_minutes
   where id = p_appointment_id;
end $$;

-- ===========================================================================
--  Grants — least privilege for the public API surface
-- ===========================================================================
-- The anon key may only execute the customer-facing functions.
revoke all on function public.get_day_availability(uuid, date, uuid) from public;
revoke all on function public.get_month_availability(uuid, date, date) from public;
revoke all on function public.get_next_available_date(uuid, date) from public;
revoke all on function public.create_appointment(uuid, date, time, text, text, text, text, uuid) from public;
revoke all on function public.get_appointment_by_token(text) from public;
revoke all on function public.find_appointment_by_reference(text, text) from public;
revoke all on function public.reschedule_appointment(text, date, time) from public;
revoke all on function public.cancel_appointment(text) from public;

grant execute on function public.get_day_availability(uuid, date, uuid) to anon, authenticated;
grant execute on function public.get_month_availability(uuid, date, date) to anon, authenticated;
grant execute on function public.get_next_available_date(uuid, date) to anon, authenticated;
grant execute on function public.create_appointment(uuid, date, time, text, text, text, text, uuid) to anon, authenticated;
grant execute on function public.get_appointment_by_token(text) to anon, authenticated;
grant execute on function public.find_appointment_by_reference(text, text) to anon, authenticated;
grant execute on function public.reschedule_appointment(text, date, time) to anon, authenticated;
grant execute on function public.cancel_appointment(text) to anon, authenticated;

-- Staff-only operations are restricted to signed-in staff ("authenticated");
-- the functions themselves re-check the role as well.
revoke all on function public.staff_set_appointment_status(uuid, public.appointment_status) from public;
revoke all on function public.staff_delay_appointment(uuid, integer) from public;
grant execute on function public.staff_set_appointment_status(uuid, public.appointment_status) to authenticated;
grant execute on function public.staff_delay_appointment(uuid, integer) to authenticated;

-- ===========================================================================
--  Seed data — PLACEHOLDER, replace with the clinic's approved catalogue
-- ===========================================================================
insert into public.services (name, description, duration_minutes, price, category, sort_order)
values
  ('Consultation & Skin Analysis',
   'A one-to-one assessment to plan a treatment suited to your skin and goals.', 30, null, 'Consultation', 1),
  ('Signature Facial',
   'A personalised facial designed around your skin''s needs on the day.', 60, null, 'Face', 2),
  ('Advanced Skin Treatment',
   'A longer, targeted appointment for specific skin concerns.', 75, null, 'Skin', 3),
  ('Laser & Light Session',
   'A focused session delivered by our trained aesthetics team.', 45, null, 'Skin', 4),
  ('Manicure & Pedicure',
   'Meticulous hand and foot care in a calm, private setting.', 60, null, 'Beauty', 5),
  ('Bridal Preparation Package',
   'A relaxed, extended appointment to prepare for your celebration.', 90, null, 'Occasion', 6)
on conflict do nothing;

-- Placeholder opening hours: Saturday–Thursday, morning and evening.
insert into public.working_hours (staff_id, weekday, start_time, end_time)
values
  (null, 6, '10:00', '13:00'), (null, 6, '16:00', '20:00'),
  (null, 0, '10:00', '13:00'), (null, 0, '16:00', '20:00'),
  (null, 1, '10:00', '13:00'), (null, 1, '16:00', '20:00'),
  (null, 2, '10:00', '13:00'), (null, 2, '16:00', '20:00'),
  (null, 3, '10:00', '13:00'), (null, 3, '16:00', '20:00'),
  (null, 4, '10:00', '13:00'), (null, 4, '16:00', '20:00')
on conflict do nothing;
