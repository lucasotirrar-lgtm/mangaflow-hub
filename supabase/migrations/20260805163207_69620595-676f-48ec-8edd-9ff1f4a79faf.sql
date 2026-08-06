CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.mangas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  synopsis text NOT NULL DEFAULT '',
  cover_url text,
  rating numeric(2,1) NOT NULL DEFAULT 4.5,
  status text NOT NULL DEFAULT 'Em andamento',
  genres text[] NOT NULL DEFAULT '{}',
  chapter text NOT NULL DEFAULT '',
  views text NOT NULL DEFAULT '',
  in_popular boolean NOT NULL DEFAULT true,
  in_releases boolean NOT NULL DEFAULT false,
  in_ranking boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mangas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mangas TO authenticated;
GRANT ALL ON public.mangas TO service_role;
ALTER TABLE public.mangas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mangas are public" ON public.mangas FOR SELECT USING (true);
CREATE POLICY "Admins manage mangas" ON public.mangas FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER mangas_updated_at BEFORE UPDATE ON public.mangas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.destaques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  synopsis text NOT NULL DEFAULT '',
  image_url text,
  rank_label text NOT NULL DEFAULT '1º',
  rating numeric(2,1) NOT NULL DEFAULT 4.5,
  status text NOT NULL DEFAULT 'Em andamento',
  genres text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.destaques TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.destaques TO authenticated;
GRANT ALL ON public.destaques TO service_role;
ALTER TABLE public.destaques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Destaques are public" ON public.destaques FOR SELECT USING (true);
CREATE POLICY "Admins manage destaques" ON public.destaques FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER destaques_updated_at BEFORE UPDATE ON public.destaques
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.noticias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.noticias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.noticias TO authenticated;
GRANT ALL ON public.noticias TO service_role;
ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Noticias are public" ON public.noticias FOR SELECT USING (true);
CREATE POLICY "Admins manage noticias" ON public.noticias FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.generos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.generos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generos TO authenticated;
GRANT ALL ON public.generos TO service_role;
ALTER TABLE public.generos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Generos are public" ON public.generos FOR SELECT USING (true);
CREATE POLICY "Admins manage generos" ON public.generos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));