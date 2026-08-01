alter table public.reuniones add column if not exists google_event_id text null;
alter table public.reuniones add column if not exists google_calendar_url text null;
create unique index if not exists reuniones_google_event_uidx on public.reuniones(google_event_id) where google_event_id is not null;
