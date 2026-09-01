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
  game_id: string;
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

export interface PaymentMethodConfig {
  code: string;
  kind: 'deposit' | 'withdrawal';
  title: string;
  description: string;
  primary_label: string;
  primary_value: string;
  secondary_label: string;
  secondary_value: string;
  note_label: string;
  note_value: string;
  input_label: string;
  input_placeholder: string;
  qr_code_url: string;
  warning_text: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletRequestRow {
  id: string;
  game_id?: string | null;
  game_title?: string | null;
  type: 'deposit' | 'withdrawal';
  amount: string;
  payment_method: string;
  details: Record<string, unknown>;
  admin_note: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  processed_at: string | null;
  requester_username: string | null;
  requester_email: string | null;
}

export interface WalletHistoryRow {
  id: string;
  game_id?: string;
  type: 'deposit' | 'withdrawal';
  amount: string;
  payment_method: string;
  details: Record<string, unknown>;
  admin_note: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}
