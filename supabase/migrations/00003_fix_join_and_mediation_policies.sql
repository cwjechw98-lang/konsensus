-- Fix: allow authenticated users to join open disputes (opponent_id IS NULL)
DROP POLICY "Participants can update disputes" ON disputes;

CREATE POLICY "Participants can update disputes"
  ON disputes FOR UPDATE
  USING (
    auth.uid() = creator_id
    OR auth.uid() = opponent_id
    OR (status = 'open' AND opponent_id IS NULL AND auth.uid() != creator_id)
  )
  WITH CHECK (
    auth.uid() = creator_id
    OR auth.uid() = opponent_id
  );

-- Fix: allow dispute participants to insert mediations
CREATE POLICY "Participants can create mediations"
  ON mediations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = mediations.dispute_id
      AND (disputes.creator_id = auth.uid() OR disputes.opponent_id = auth.uid())
    )
  );
