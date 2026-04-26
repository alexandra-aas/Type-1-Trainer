# Type-1 Trainer

A meal coaching app for parents managing a child's Type 1 diabetes. The app helps plan breakfast, snack, and lunch each morning based on the child's recent blood glucose trend, weekly schedule, and food history — powered by Claude AI.

## Features

- **Morning meal planner** — Claude suggests breakfast, snack, and lunch as a batch, grounded in the last 24h BG trend, today's activities, and food reaction history
- **Blood glucose tracking** — Manual entry or Dexcom CSV import
- **USDA food search** — Search the FoodData Central database with adjustable serving sizes
- **Favorites shelf** — Save frequently used foods for one-tap logging
- **Photo label scan** — Photograph a nutrition label; Claude Vision extracts carb info
- **Weekly schedule** — Set recurring activities once; the planner uses them automatically
- **Post-meal BG capture** — Log after-meal readings to build food reaction history over time
- **PWA-ready** — Installable on mobile, works offline for logging (API features require connection)

All data is stored locally in the browser (`localStorage`). No account required.

## Setup

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`) for local dev with serverless functions
- A free [USDA FoodData Central API key](https://fdc.nal.usda.gov/api-guide.html)
- An [Anthropic API key](https://console.anthropic.com)

### Local development

```bash
npm install
```

Create a `.env.local` file (never commit this):

```
ANTHROPIC_API_KEY=sk-ant-...
USDA_API_KEY=...
```

Run with Vercel dev (needed for `/api` functions):

```bash
vercel dev
```

Or plain Vite (API calls will fail without the proxy):

```bash
npm run dev
```

### Deploy to Vercel

1. Connect this repo in the [Vercel dashboard](https://vercel.com/new)
2. Add environment variables:
   - `ANTHROPIC_API_KEY`
   - `USDA_API_KEY`
3. Deploy — Vercel auto-detects Vite and the `/api` functions

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS v3 |
| Serverless | Vercel Functions (`/api/claude.js`, `/api/usda.js`) |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Food data | USDA FoodData Central |
| Storage | `localStorage` (cloud sync hook planned) |

## Data stored locally

| Key | Contents |
|-----|----------|
| `mgc_bg_v1` | Blood glucose readings |
| `mgc_logs_v1` | Daily meal logs with BG before/after |
| `mgc_favorites_v1` | Saved foods (max 50) |
| `mgc_schedule_v1` | Weekly recurring activities |
| `mgc_settings_v1` | Child name, BG units, target range, USDA key |
