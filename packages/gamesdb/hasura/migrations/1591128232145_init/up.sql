CREATE FUNCTION public.set_current_timestamp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$;
CREATE TABLE public.gamesession (
    id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    player1 text NOT NULL,
    player2 text NOT NULL,
    state text NOT NULL,
    meta text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE ONLY public.gamesession
    ADD CONSTRAINT gamesession_pkey PRIMARY KEY (id);
CREATE TRIGGER set_public_gamesession_updated_at BEFORE UPDATE ON public.gamesession FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_gamesession_updated_at ON public.gamesession IS 'trigger to set value of column "updated_at" to current timestamp on row update';
