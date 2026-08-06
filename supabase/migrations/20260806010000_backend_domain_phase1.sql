-- Yae House backend domain - phase 1
-- Canonical entities are provider-agnostic. Existing CMS tables remain untouched.

CREATE TYPE public.work_type AS ENUM ('manga', 'manhwa', 'light_novel');
CREATE TYPE public.age_rating AS ENUM ('livre', '10', '12', '14', '16', '18');
CREATE TYPE public.work_status AS ENUM ('announced', 'ongoing', 'hiatus', 'completed', 'cancelled', 'unknown');
CREATE TYPE public.source_kind AS ENUM ('mangadex', 'consumet', 'suwayomi', 'anilist', 'tmdb', 'local', 'other');
CREATE TYPE public.job_status AS ENUM ('pending', 'running', 'succeeded', 'failed', 'cancelled', 'dead_letter');
CREATE TYPE public.asset_status AS ENUM ('pending', 'available', 'stale', 'failed', 'blocked', 'deleted');
CREATE TYPE public.storage_policy AS ENUM ('metadata_only', 'cache_allowed', 'persistent_allowed', 'blocked');

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  locale text NOT NULL DEFAULT 'pt-BR',
  age_verified_at timestamptz,
  age_verification_method text,
  adult_content_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT adult_requires_verification CHECK (NOT adult_content_enabled OR age_verified_at IS NOT NULL)
);

CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  kind public.source_kind NOT NULL,
  base_url text,
  enabled boolean NOT NULL DEFAULT true,
  priority smallint NOT NULL DEFAULT 100,
  capabilities jsonb NOT NULL DEFAULT '{}',
  config_public jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  work_type public.work_type NOT NULL,
  canonical_title text NOT NULL,
  synopsis text NOT NULL DEFAULT '',
  age_rating public.age_rating NOT NULL DEFAULT 'livre',
  status public.work_status NOT NULL DEFAULT 'unknown',
  original_language text,
  release_year smallint,
  rating numeric(3,2),
  primary_source_id uuid REFERENCES public.sources(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT work_rating_range CHECK (rating IS NULL OR rating BETWEEN 0 AND 5),
  CONSTRAINT work_year_range CHECK (release_year IS NULL OR release_year BETWEEN 1800 AND 2200)
);

CREATE TABLE public.work_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  title text NOT NULL,
  language text,
  title_type text NOT NULL DEFAULT 'alias',
  normalized_title text NOT NULL,
  UNIQUE (work_id, normalized_title, language)
);

CREATE TABLE public.external_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  external_url text,
  UNIQUE (source_id, external_id)
);

CREATE TABLE public.source_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  confidence numeric(5,4) NOT NULL DEFAULT 1,
  is_primary boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_id),
  CONSTRAINT mapping_confidence_range CHECK (confidence BETWEEN 0 AND 1)
);

CREATE TABLE public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'
);
CREATE UNIQUE INDEX people_normalized_name_idx ON public.people(normalized_name);

CREATE TABLE public.work_people (
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('author', 'artist')),
  PRIMARY KEY (work_id, person_id, role)
);

CREATE TABLE public.genres_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  is_adult boolean NOT NULL DEFAULT false
);
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  is_adult boolean NOT NULL DEFAULT false
);
CREATE TABLE public.work_genres (
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  genre_id uuid NOT NULL REFERENCES public.genres_v2(id) ON DELETE CASCADE,
  PRIMARY KEY (work_id, genre_id)
);
CREATE TABLE public.work_tags (
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (work_id, tag_id)
);

CREATE TABLE public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  chapter_number numeric(10,3),
  volume_number numeric(10,3),
  title text,
  language text NOT NULL DEFAULT 'pt-BR',
  published_at timestamptz,
  page_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (work_id, chapter_number, volume_number, language)
);

CREATE TABLE public.chapter_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  external_url text,
  quality_score numeric(5,4) NOT NULL DEFAULT 1,
  available boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  UNIQUE (source_id, external_id),
  CONSTRAINT chapter_quality_range CHECK (quality_score BETWEEN 0 AND 1)
);

CREATE TABLE public.image_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid REFERENCES public.works(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.sources(id) ON DELETE SET NULL,
  asset_kind text NOT NULL CHECK (asset_kind IN ('cover', 'thumbnail', 'chapter_page', 'avatar', 'other')),
  source_url text,
  internal_path text,
  mime_type text,
  byte_size bigint,
  sha256 text,
  width integer,
  height integer,
  status public.asset_status NOT NULL DEFAULT 'pending',
  storage_policy public.storage_policy NOT NULL DEFAULT 'metadata_only',
  expires_at timestamptz,
  last_verified_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asset_owner CHECK (work_id IS NOT NULL OR chapter_id IS NOT NULL)
);
CREATE UNIQUE INDEX image_assets_sha256_idx ON public.image_assets(sha256) WHERE sha256 IS NOT NULL;

CREATE TABLE public.user_library (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'reading' CHECK (status IN ('planned', 'reading', 'paused', 'completed', 'dropped')),
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, work_id)
);
CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, work_id)
);
CREATE TABLE public.custom_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.custom_list_items (
  list_id uuid NOT NULL REFERENCES public.custom_lists(id) ON DELETE CASCADE,
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, work_id)
);
CREATE TABLE public.reading_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  device_id text,
  metadata jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE public.chapter_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  progress numeric(5,4) NOT NULL DEFAULT 0,
  last_page integer,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chapter_id),
  CONSTRAINT progress_range CHECK (progress BETWEEN 0 AND 1)
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  new_chapters boolean NOT NULL DEFAULT true,
  provider_incidents boolean NOT NULL DEFAULT true,
  ingestion_events boolean NOT NULL DEFAULT false,
  quiet_hours jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  source_id uuid REFERENCES public.sources(id) ON DELETE SET NULL,
  work_id uuid REFERENCES public.works(id) ON DELETE CASCADE,
  deduplication_key text NOT NULL,
  priority smallint NOT NULL DEFAULT 100,
  status public.job_status NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL DEFAULT '{}',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_error jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ingestion_jobs_active_dedupe_idx ON public.ingestion_jobs(deduplication_key)
  WHERE status IN ('pending', 'running');
CREATE INDEX ingestion_jobs_worker_idx ON public.ingestion_jobs(status, priority, available_at);

CREATE TABLE public.image_fetch_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.image_assets(id) ON DELETE CASCADE,
  status public.job_status NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  last_error jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.sync_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id uuid REFERENCES public.ingestion_jobs(id) ON DELETE SET NULL,
  source_id uuid REFERENCES public.sources(id) ON DELETE SET NULL,
  level text NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  event text NOT NULL,
  message text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.provider_health (
  source_id uuid PRIMARY KEY REFERENCES public.sources(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('healthy', 'degraded', 'unavailable', 'unknown')),
  latency_ms integer,
  consecutive_failures integer NOT NULL DEFAULT 0,
  circuit_open_until timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rate_limit_state (
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  bucket_key text NOT NULL,
  remaining integer,
  reset_at timestamptz,
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_id, bucket_key)
);
CREATE TABLE public.admin_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX works_catalog_idx ON public.works(work_type, age_rating, status) WHERE deleted_at IS NULL;
CREATE INDEX work_titles_search_idx ON public.work_titles USING gin (to_tsvector('simple', normalized_title));
CREATE INDEX chapters_work_published_idx ON public.chapters(work_id, published_at DESC);
CREATE INDEX reading_history_user_idx ON public.reading_history(user_id, read_at DESC);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX sync_logs_created_idx ON public.sync_logs(created_at DESC);

-- Keep updated_at consistent.
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER sources_updated_at BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER works_updated_at BEFORE UPDATE ON public.works FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER source_mappings_updated_at BEFORE UPDATE ON public.source_mappings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER chapters_updated_at BEFORE UPDATE ON public.chapters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER image_assets_updated_at BEFORE UPDATE ON public.image_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER user_library_updated_at BEFORE UPDATE ON public.user_library FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER custom_lists_updated_at BEFORE UPDATE ON public.custom_lists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER chapter_progress_updated_at BEFORE UPDATE ON public.chapter_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ingestion_jobs_updated_at BEFORE UPDATE ON public.ingestion_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER image_fetch_jobs_updated_at BEFORE UPDATE ON public.image_fetch_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: service_role performs ingestion; users only see their own state.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_self ON public.profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY works_age_safe_read ON public.works FOR SELECT TO authenticated USING (
  age_rating <> '18' OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.age_verified_at IS NOT NULL AND p.adult_content_enabled
  )
);
CREATE POLICY user_library_self ON public.user_library FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY favorites_self ON public.favorites FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY custom_lists_self ON public.custom_lists FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY custom_list_items_self ON public.custom_list_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.custom_lists l WHERE l.id = list_id AND l.user_id = auth.uid())
) WITH CHECK (EXISTS (SELECT 1 FROM public.custom_lists l WHERE l.id = list_id AND l.user_id = auth.uid()));
CREATE POLICY reading_history_self ON public.reading_history FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY chapter_progress_self ON public.chapter_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notifications_self ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY notification_preferences_self ON public.notification_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.user_library, public.favorites,
  public.custom_lists, public.custom_list_items, public.reading_history, public.chapter_progress,
  public.notification_preferences TO authenticated;
GRANT SELECT ON public.works, public.work_titles, public.external_ids, public.source_mappings,
  public.people, public.work_people, public.genres_v2, public.tags, public.work_genres,
  public.work_tags, public.chapters, public.chapter_sources, public.image_assets, public.sources,
  public.notifications TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

INSERT INTO public.sources (key, name, kind, priority, capabilities) VALUES
  ('local', 'Biblioteca local', 'local', 10, '{"catalog":true,"chapters":true,"assets":true}'),
  ('mangadex', 'MangaDex', 'mangadex', 20, '{"catalog":true,"chapters":true,"covers":true}'),
  ('consumet', 'Consumet self-hosted', 'consumet', 30, '{"catalog":true,"chapters":true}'),
  ('suwayomi', 'Suwayomi', 'suwayomi', 40, '{"catalog":true,"chapters":true,"reader":true}'),
  ('anilist', 'AniList', 'anilist', 60, '{"metadata":true}');
