ALTER TABLE wallet_requests
  ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES games(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_wallet_requests_game ON wallet_requests(game_id);
CREATE INDEX IF NOT EXISTS idx_wallet_requests_user_game ON wallet_requests(user_id, game_id);
