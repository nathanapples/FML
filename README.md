# FML: Fantasy Marble League

A small web app for running a fantasy league on top of Jelle's Marble Runs' Marble League. Each league team drafts marble teams into slots, scores whatever its marbles score in each event, and can trade a slot from any event onward.

It runs as one container with a SQLite database in a volume, and everything is managed from a password-protected admin area.

## Install

```yaml
services:
  fml:
    image: ghcr.io/nathanapples/fml:latest
    container_name: fml
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Etc/UTC
      - ADMIN_PASSWORD=change-me
    volumes:
      - ./config:/config
    ports:
      - 5076:5076
    restart: unless-stopped
```

Paste that into a new Dockge stack (or `docker compose up -d`), change `ADMIN_PASSWORD`, and open `http://<host>:5076`.

The first start loads a made-up demo league so there's something to look at. Set `SEED=false` to start empty, or delete the demo season under Admin, Seasons and backup once your own league is in.

The image is built by GitHub Actions on every push to main and published to `ghcr.io/nathanapples/fml` for amd64 and arm64.

### Environment variables

| Variable | Purpose |
|---|---|
| `PUID` / `PGID` / `TZ` / `UMASK` | Container user, group, time zone, umask |
| `ADMIN_PASSWORD` | Password for `/admin`. Admin is off when unset |
| `SESSION_SECRET` | Signs the admin cookie (defaults to one derived from the password). Changing it signs everyone out |
| `SEED` | `false` skips loading the demo league into an empty database |
| `COOKIE_SECURE` | `true` if you serve FML only over HTTPS |

Everything FML keeps lives in `/config`: `fml.db` and the `flags/` folder.

The public pages are read-only; anything that changes data sits behind the admin password. If you expose FML to the internet, put it behind HTTPS (Caddy, Nginx Proxy Manager, Cloudflare Tunnel) and set `COOKIE_SECURE=true`.

## Using it

- **Standings** (`/`): the leaderboard, season progress, the race chart (total points or league position), and the latest podium.
- **Events** (`/events`): every event and a results grid; each event has its own page with the finishing order and each league team's haul.
- **Marbles** (`/marbles`): marble team standings, medals and how many league teams own each.
- **Team pages** (`/teams/:id`): slots, trade history and an event-by-event breakdown.
- **Admin** (`/admin`):
  - *Results*: tap marble teams in finishing order. Points come from the season's points table (25, 20, 15, 12 … 0 by default) and any of them can be edited.
  - *Events*: names, dates, wiki and video links.
  - *League teams*: names, managers, flags, draft order, picks and trades. A trade is "this slot holds this marble from event N".
  - *Marble teams*: colours (the marble is drawn from these), optional logo, wiki link, and which teams are competing this season.
  - *Seasons and backup*: start a new season (optionally carrying over marble teams and managers), change the points table, download a full JSON backup, or restore one.

## How scoring works

For each event, a slot is held by the pick with the highest `startEvent` that is less than or equal to the event number. The slot earns that marble team's points for the event. A league team's event total is the sum of its slots; positions use competition ranking, so ties share a place.

## Development

```bash
npm install
ADMIN_PASSWORD=dev npm run dev
```

Data goes to `./data`. Stack: Next.js (App Router, server actions), React, Tailwind CSS, Recharts and better-sqlite3.

## Bringing in an existing league

Admin, Seasons and backup, Restore accepts either a full FML backup (replaces everything, flags included) or a single season file in the format of [`seed/season-demo.json`](seed/season-demo.json), which is added alongside your other seasons.
