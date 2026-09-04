-- Sprint S / S-14: create the table the abuse panel has always read.
--
-- src/app/admin/intelligence/page.tsx selects from rate_limit_hits. The table
-- has never existed, so the query returned {data: null, error}, the panel read
-- that as "no hits", and the "⚠ N rate limit hits" warning could not fire even
-- while the middleware was blocking people. Nothing wrote the table either —
-- there was no writer to go with the reader.
--
-- The shape follows what the middleware can actually observe. Both block points
-- sit before the Supabase client is created, so there is no authenticated user
-- to attribute a hit to: only the request's IP and which limiter tripped. The
-- IP is stored as a salted hash rather than in the clear, matching consent_log —
-- the panel's question is "how many distinct sources", not "who".

CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Which limiter tripped: 'login' or 'quiz'.
  limiter    text NOT NULL,
  -- The request path, so a limiter covering several routes stays legible.
  path       text NOT NULL,
  -- sha256(ip:IP_HASH_SALT). Nullable because a request with no forwarded-for
  -- header still deserves to be counted.
  ip_hash    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The panel reads the newest hits first; every other query here is "how many
-- since <time>". Both are served by this.
CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_created_at
  ON public.rate_limit_hits (created_at DESC);

-- RLS on with no policies: the service role bypasses it and everyone else is
-- denied. The middleware writes with the service key and the admin page reads
-- with it; no end user has any business touching this table.
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
