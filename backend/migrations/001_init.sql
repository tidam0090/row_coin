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
  ('juwa777',      'Juwa777',      'Casino',    '', '🎰', 'https://dl.juwa777.com/', 'https://dl.juwa777.com/', 1),
  ('gamevault',    'Gamevault',    'Arcade',    '', '🛡', 'https://download.gamevault999.com/', 'https://download.gamevault999.com/', 2),
  ('vegas-sweeps', 'Vegas Sweeps', 'Casino',    '', '🎲', 'https://m.lasvegassweeps.com/', 'https://m.lasvegassweeps.com/', 3),
  ('ultrapanda',   'Ultrapanda',   'Arcade',    '', '🐼', 'https://www.ultrapanda.club/', 'https://www.ultrapanda.club/', 4),
  ('bluedragon',   'Bluedragon',   'Arcade',    '', '🐉', 'http://app.bluedragon777.com/', 'http://app.bluedragon777.com/', 5),
  ('cashfrenzy',   'Cashfrenzy',   'Casino',    '', '💰', 'https://www.cashfrenzy777.com/', 'https://www.cashfrenzy777.com/', 6),
  ('cashmachine',  'Cashmachine',  'Casino',    '', '🪙', 'https://www.cashmachine777.com/', 'https://www.cashmachine777.com/', 7),
  ('firekirin',    'Firekirin',    'Casino',    '', '🔥', 'https://start.firekirin.xyz:8580/', 'https://start.firekirin.xyz:8580/', 8),
  ('gameroom',     'gameroom',     'Arcade',    '', '🎮', 'https://www.gameroom777.com/', 'https://www.gameroom777.com/', 9),
  ('juwa2',        'Juwa2',        'Casino',    '', '🎰', 'https://m.juwa2.com/', 'https://m.juwa2.com/', 10),
  ('mafia',        'Mafia',        'Casino',    '', '🕶', 'https://www.mafia77777.com/', 'https://www.mafia77777.com/', 11),
  ('milkyway',     'Milkyway',     'Casino',    '', '🌌', 'https://milkywayapp.xyz/', 'https://milkywayapp.xyz/', 12),
  ('noble',        'Noble',        'Casino',    '', '👑', 'https://www.noble777.com/', 'https://www.noble777.com/', 13),
  ('orionstars',   'Orionstars',   'Casino',    '', '⭐', 'http://start.orionstars.vip:8580/', 'http://start.orionstars.vip:8580/', 14),
  ('pandamaster',  'Pandamaster',  'Casino',    '', '🐼', 'https://pandamaster.vip:8888/', 'https://pandamaster.vip:8888/', 15),
  ('riversweeps',  'RiverSweeps',  'Casino',    '', '🌊', 'https://bet777.eu/play/', 'https://bet777.eu/play/', 16),
  ('vblink',       'VB Link',      'Casino',    '', '🔗', 'https://www.vblink777.club/', 'https://www.vblink777.club/', 17),
  ('falcon-royle', 'Falcon Royle', 'Casino',    '', '🦅', 'https://game.falcongamings.com/', 'https://game.falcongamings.com/', 18)
ON CONFLICT (slug) DO NOTHING;
