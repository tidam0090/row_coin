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
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  genre = EXCLUDED.genre,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  play_url = EXCLUDED.play_url,
  download_url = EXCLUDED.download_url,
  sort_order = EXCLUDED.sort_order;