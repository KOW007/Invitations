-- Run this in your Supabase project's SQL editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Events ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  subtitle         TEXT,
  event_date       DATE,
  event_time       TEXT,
  end_time         TEXT,
  location         TEXT,
  address          TEXT,
  description      TEXT,
  image_path       TEXT,
  accept_text      TEXT        NOT NULL DEFAULT 'Count me in!',
  decline_text     TEXT        NOT NULL DEFAULT 'Sorry to miss',
  reminder_message TEXT,
  day_of_message   TEXT,
  rsvp_question_1  TEXT,
  rsvp_question_2  TEXT,
  active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Invitees ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitees (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  first_name         TEXT        NOT NULL,
  last_name          TEXT,
  email              TEXT,
  token              UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  response           TEXT        CHECK (response IN ('yes', 'no')),
  message            TEXT,
  rsvp_answer_1      TEXT,
  rsvp_answer_2      TEXT,
  responded_at       TIMESTAMPTZ,
  invited_at         TIMESTAMPTZ,
  reminder1_sent_at  TIMESTAMPTZ,
  reminder2_sent_at  TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS events_user_id_idx    ON events(user_id);
CREATE INDEX IF NOT EXISTS invitees_event_id_idx ON invitees(event_id);
CREATE INDEX IF NOT EXISTS invitees_token_idx    ON invitees(token);

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitees ENABLE ROW LEVEL SECURITY;

-- Authenticated users see only their own events
CREATE POLICY "events_owner" ON events
  FOR ALL TO authenticated
  USING     (user_id = auth.uid())
  WITH CHECK(user_id = auth.uid());

-- Authenticated users see only invitees for their own events
CREATE POLICY "invitees_owner" ON invitees
  FOR ALL TO authenticated
  USING     (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()))
  WITH CHECK(event_id IN (SELECT id FROM events WHERE user_id = auth.uid()));

-- Service-role key (used by server for RSVP) bypasses RLS automatically.
-- No anonymous policies needed — all public RSVP calls go through the server
-- using the service-role key.
