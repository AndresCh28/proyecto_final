drop index if exists public.reuniones_google_event_uidx;
alter table public.reuniones drop column if exists google_event_id;
alter table public.reuniones drop column if exists google_calendar_url;
