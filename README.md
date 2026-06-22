# LocallyExplained

Interactive storypoint map for city visitors. Built with Next.js, React, TypeScript, MapLibre GL JS, and Neon PostgreSQL.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to `/ca`.

## Project Status

This is a functional MVP with:

- Interactive MapLibre map with storypoint pins
- Full story reader with text-to-speech
- Storypoint request workflow with admin moderation
- User accounts, favorites, and profile management
- Password recovery via email
- Multilingual UI (Catalan, Spanish, English)
- Neon PostgreSQL for production data (JSON file fallback for local development)
- Resend for transactional emails (console fallback for local development)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Runtime | Node.js 22 |
| Language | TypeScript 5.8 |
| Frontend | React 19 |
| Map | MapLibre GL JS 5.5 + OpenStreetMap tiles |
| Database | Neon PostgreSQL (serverless) with JSON fallback |
| Email | Resend |
| Styling | Plain CSS (global) |

## Documentation

- `docs/DEVELOPER_GUIDE.md` - New developer onboarding and architecture deep-dive
- `docs/engineering-guide.md` - Engineering conventions and maintenance
- `docs/USER_DATABASE.md` - User account and database models
- `docs/storypoints-plan.md` - Product requirements and roadmap
- `docs/resend-guide.md` - Email integration guide

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run db:seed` | Seed database with initial data |

## License

Private
