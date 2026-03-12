-- Konsensus MVP: Initial database schema
-- Created: 2026-03-12

-- Custom types
CREATE TYPE dispute_status AS ENUM ('open', 'in_progress', 'mediation', 'resolved', 'closed');
CREATE TYPE resolution_status AS ENUM ('proposed', 'accepted', 'rejected');

-- Profiles (extends Supabase Auth users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Disputes
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status dispute_status DEFAULT 'open' NOT NULL,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  max_rounds INT DEFAULT 3 NOT NULL CHECK (max_rounds BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Arguments
CREATE TABLE arguments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  round INT NOT NULL CHECK (round >= 1),
  position TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  evidence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(dispute_id, author_id, round)
);

-- Mediations (AI analysis results)
CREATE TABLE mediations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  analysis JSONB NOT NULL,
  solutions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Resolutions (chosen solution)
CREATE TABLE resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  chosen_solution INT NOT NULL,
  accepted_by UUID[] DEFAULT '{}' NOT NULL,
  status resolution_status DEFAULT 'proposed' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_disputes_creator ON disputes(creator_id);
CREATE INDEX idx_disputes_opponent ON disputes(opponent_id);
CREATE INDEX idx_disputes_invite_code ON disputes(invite_code);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_arguments_dispute ON arguments(dispute_id);
CREATE INDEX idx_arguments_author ON arguments(author_id);
CREATE INDEX idx_mediations_dispute ON mediations(dispute_id);
CREATE INDEX idx_resolutions_dispute ON resolutions(dispute_id);

-- =============================================================
-- Row Level Security
-- =============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE arguments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediations ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolutions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read any profile, update only their own
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Disputes: participants can see their disputes
CREATE POLICY "Users can view own disputes"
  ON disputes FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = opponent_id);

CREATE POLICY "Authenticated users can create disputes"
  ON disputes FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Participants can update disputes"
  ON disputes FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = opponent_id);

-- Allow anyone to view a dispute by invite_code (for joining)
CREATE POLICY "Anyone can view dispute by invite code"
  ON disputes FOR SELECT
  USING (invite_code IS NOT NULL);

-- Arguments: only dispute participants can see/create
CREATE POLICY "Participants can view arguments"
  ON arguments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = arguments.dispute_id
      AND (disputes.creator_id = auth.uid() OR disputes.opponent_id = auth.uid())
    )
  );

CREATE POLICY "Participants can create arguments"
  ON arguments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = arguments.dispute_id
      AND (disputes.creator_id = auth.uid() OR disputes.opponent_id = auth.uid())
    )
  );

-- Mediations: only dispute participants can view
CREATE POLICY "Participants can view mediations"
  ON mediations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = mediations.dispute_id
      AND (disputes.creator_id = auth.uid() OR disputes.opponent_id = auth.uid())
    )
  );

-- Mediations: only service role inserts (via API route)
-- No INSERT policy for regular users — handled server-side

-- Resolutions: participants can view and update
CREATE POLICY "Participants can view resolutions"
  ON resolutions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = resolutions.dispute_id
      AND (disputes.creator_id = auth.uid() OR disputes.opponent_id = auth.uid())
    )
  );

CREATE POLICY "Participants can update resolutions"
  ON resolutions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = resolutions.dispute_id
      AND (disputes.creator_id = auth.uid() OR disputes.opponent_id = auth.uid())
    )
  );
