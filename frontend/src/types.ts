export interface Game {
  id: string;
  slug: string;
  title: string;
  genre: string;
  description: string;
  icon: string;
  play_url: string | null;
  download_url: string | null;
}

export interface AccessRequest {
  id: string;
  status: 'pending' | 'fulfilled';
  username: string | null;
  password: string | null;
  created_at: string;
  fulfilled_at: string | null;
  game_title: string;
  game_slug: string;
  game_icon: string;
  game_genre: string;
  play_url: string | null;
  download_url: string | null;
}

export interface AdminRequestRow {
  id: string;
  status: 'pending' | 'fulfilled';
  username: string | null;
  password: string | null;
  created_at: string;
  fulfilled_at: string | null;
  game_title: string;
  requester_username: string | null;
  requester_email: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}
