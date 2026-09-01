-- Add unique constraint to prevent duplicate pending access requests
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_game_pending
ON access_requests (user_id, game_id)
WHERE status = 'pending';

-- Add index for wallet requests query performance
CREATE INDEX IF NOT EXISTS idx_wallet_requests_status ON wallet_requests(status);
CREATE INDEX IF NOT EXISTS idx_wallet_requests_created ON wallet_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_requests_user ON wallet_requests(user_id);

-- Add index for access requests
CREATE INDEX IF NOT EXISTS idx_access_requests_user ON access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_game ON access_requests(game_id);

-- Add created_at and user_id columns to access_requests if missing (safety check)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='access_requests' AND column_name='user_id'
  ) THEN
    ALTER TABLE access_requests ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;
