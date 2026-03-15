CREATE TABLE IF NOT EXISTS release_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  features TEXT[] NOT NULL DEFAULT '{}',
  hero_image_url TEXT,
  notes TEXT,
  source_commits TEXT[] DEFAULT '{}',
  sent_to_bot_at TIMESTAMPTZ,
  sent_to_channel_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
