# alexsimpson.dev

Personal portfolio of **Alex Simpson** — CS + Data Science @ UC Berkeley. Security, hardware, and AI, presented as an interactive 3D experience.

**Live site:** https://alexsimpson.dev

## Highlights

- **Interactive 3D homepage** — a WebGL space scene (three.js / React Three Fiber) with clickable objects that warp you to the matching project page.
- **CubeSat telemetry PCB showcase** — the real board as an exploded-view GLB model with per-section design walkthroughs (crypto, datapath, firmware).
- **Solar cycle research** — a custom GLSL plasma-shader sun fronting a full research write-up on modeling the solar butterfly diagram (classical + diffusion hybrid).
- **World page** — a travel globe with visitor-submitted place recommendations (Redis-backed in production).
- **`/plain`** — a fast, low-motion fallback of the entire site for accessibility and quick recruiter skims.

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · three.js + @react-three/fiber · motion · Lenis · Playwright (e2e)

## Development

```bash
npm install
npm run dev        # dev server at localhost:3000
npm run build      # production build
npm run lint       # eslint
npm run test:e2e   # playwright e2e tests
```

### Environment

The World page's shared recommendations use a Redis REST backend when deployed:

| Variable | Purpose |
| --- | --- |
| `KV_REST_API_URL` | Upstash / Vercel KV REST endpoint |
| `KV_REST_API_TOKEN` | Auth token for the endpoint |

Without them, submissions fall back to a local JSON file (fine for dev; ephemeral on serverless).

## Structure

- `src/app` — routes (home, `/projects`, `/hire-me`, `/world`, `/plain` mirror)
- `src/components` — 3D scenes, PCB showcase, research write-up, site chrome
- `src/lib/portfolio-data.ts` — single source of truth for profile, projects, and experience content
- `research/` — the solar-cycle analysis write-up backing the site's research section
