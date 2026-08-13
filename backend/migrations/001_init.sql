CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  genre TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎮',
  play_url TEXT,
  download_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled')),
  username TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created ON access_requests(created_at DESC);

INSERT INTO games (slug, title, genre, description, icon, play_url, download_url, sort_order)
VALUES
  ('juwa777',        'JUWA 777',       'Casino',          'High-octane slot action with bonus spins and jackpots.', '🎰',  NULL, 'https://dl.juwa777.com/', 1),
  ('gamevault',      'GAME VAULT',     'Arcade',          'Secure vault games with premium rewards and instant access.', '🛡',  NULL, 'https://download.gamevault999.com/', 2),
  ('skyline-drift',  'SKYLINE DRIFT',   'Arcade Racer',    'Late-night circuits across a neon-lit coastal city.', '🏁',  'https://example.com/play/skyline-drift',  'https://example.com/download/skyline-drift',  3),
  ('crimson-tactics','CRIMSON TACTICS', 'Tactics',         'Turn-based squad battles on a shifting battlefield.', '♟',  'https://example.com/play/crimson-tactics','https://example.com/download/crimson-tactics',4),
  ('starforge',      'STARFORGE ARENA', 'Arena Shooter',   '6v6 zero-gravity skirmishes with modular loadouts.', '🚀',  'https://example.com/play/starforge',      'https://example.com/download/starforge',      5),
  ('glitch-hunters', 'GLITCH HUNTERS',  'Puzzle Platform', 'Chase corrupted data across a breaking-down world.', '👾',  'https://example.com/play/glitch-hunters', 'https://example.com/download/glitch-hunters', 6)
ON CONFLICT (slug) DO NOTHING;
