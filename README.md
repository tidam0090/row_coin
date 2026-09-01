# Coin Row — free-play game portal

Players register/sign in, pick a game, and request access. Staff generate
a login for that game and send it back through the admin panel; the
player's page updates live and shows the credentials plus "Enter game" /
"Download client" links.

**Free-play only.** There is no deposit, withdrawal, currency, or cash
value anywhere in this app — it's purely an access-request/fulfillment
flow for game accounts you control.

Stack: React + TypeScript (Vite) frontend, Express + TypeScript backend,
PostgreSQL database.

## 1. Database

```bash
docker compose up -d
```
(or point `DATABASE_URL` at any Postgres 13+ instance you already have —
native install, Neon, Supabase, whatever.)

## 2. Backend

```bash
cd backend
cp .env.example .env      # set ADMIN_KEY and JWT_SECRET to long random strings
npm install
npm run migrate           # creates tables + seeds 18 placeholder games
npm run dev                # http://localhost:4000
```

`npm run migrate` runs every `.sql` file in `migrations/` in order, so
it's safe to re-run after pulling new migrations later.

## 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```

## Using it

- **Register/Login** (`/register`, `/login`) — email, username, password.
  Passwords are hashed with bcrypt; a JWT is issued and stored in the
  browser to authenticate future requests.
- **Lobby** (`/`) — pick a game to request access. If you already have a
  request in for that game, it takes you straight back to it instead of
  creating a duplicate.
- **Request status** — polls every 2.5s and updates on its own once
  staff fulfill it.
- **Staff panel** (`/admin`) — separate from player accounts, gated by
  the `ADMIN_KEY` you set in `backend/.env`. Two tabs: **Pending** and
  **Completed**. Each pending ticket shows which player requested it
  (username + email) and a form to issue that game's username/password.

## Editing the game catalog

Games live in the `games` table (`backend/migrations/001_init.sql` seeds
six placeholders). Edit `play_url` / `download_url` per game to point at
your real launcher and download URLs.

## Security notes before you put this anywhere public

- Set real random values for `ADMIN_KEY` and `JWT_SECRET` in
  `backend/.env` — `openssl rand -hex 32` works well for both.
- The admin key is a single shared secret — fine for a couple of trusted
  staff, not real multi-user role-based auth. Swap in proper per-staff
  accounts before opening `/admin` up to more people.
- Issued game credentials are stored in plaintext in
  `access_requests.username` / `.password` so both staff and the player
  can read them back. That's fine for game accounts you control; it is
  not appropriate for real third-party account passwords of any kind.
- Put this behind HTTPS in production — JWTs, login credentials, and
  issued game credentials all travel over the wire.
