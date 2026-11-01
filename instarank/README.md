# InstaRank: Instagram SEO & Reel Trend SaaS

Part of **Prime Growth 360**. InstaRank helps creators, brands and agencies **get found in Instagram search** and **post while a topic is hot**.

| Module | What it solves |
| --- | --- |
| **Keyword Research** | Turns a seed keyword into 30-60 keyword ideas from real autocomplete phrases plus question, long-tail, local and commercial patterns. Scores each for **Opportunity**, **Competition** and **AEO fit**, and suggests a 3-5 hashtag set. |
| **Analyze live** | For any keyword, pulls the matching hashtag's top and last-24h posts from the Instagram Graph API and measures demand (posts per 24h), difficulty (engagement you must beat), Reel share and freshness. |
| **Trending Reels** | Ranks Reels by **engagement velocity with time decay** and labels them *breakout*, *rising*, *steady* or *evergreen*. It also extracts what the winners share: co-used hashtags, caption words, hook lines, question and CTA rates, caption length and best posting hours. |
| **Live Tracker** | A board that updates itself over Server-Sent Events and ranks Reels by **engagement gained per minute** since the last refresh, so you see what is performing right now. |
| **Competitors** | Public metrics and best Reels of any Business/Creator account (Business Discovery API). |
| **SEO + AEO Caption Studio** | Writes 3 caption variants (question-led, how-to with a Q/A block, story) with the keyword in the first 125 characters, a direct answer for answer engines, natural related keywords, CTA and 3-5 hashtags. It also gives on-screen text, a spoken hook, alt text, cover title, profile name field, bio line and an FAQ block. Optional **AI mode** uses Claude. |
| **Caption Audit** | Scores any caption from 0 to 100 against 10 weighted Instagram SEO/AEO checks and lists the exact fixes. |
| **SaaS layer** | Accounts (scrypt-hashed passwords, HttpOnly sessions), Free/Pro/Agency plans with monthly quotas, Stripe Payment Links, saved library, encrypted Instagram tokens, rate limiting, CSRF protection and security headers. |

## Use it just for yourself (free: no login, no payments, no API keys)

**Option A: single file, no install.** Open `standalone/instarank.html` in any browser. It runs keyword research, the caption studio, the caption audit and a Reel analyzer (paste likes, comments and age of Reels you see on Instagram) entirely in your browser. To get live Instagram data, you can optionally paste your own free Graph API token there; it stays in your browser. Rebuild after editing `src/` with `node tools/build-standalone.mjs`.

**Option B: full app on your computer.** Set `PERSONAL_MODE=true` in `.env` (the default in `.env.example`), then run `npm install && npm start` and open http://localhost:3000. There is no login and there are no plans or payments, and usage is unlimited. Keep this server private, because anyone who can reach it uses it as you.

Costs: the Instagram Graph API is free, and AI captions are optional (leave `ANTHROPIC_API_KEY` empty and nothing is ever charged).

## Quick start

```bash
cd instarank
cp .env.example .env        # set APP_SECRET
npm install
npm start                   # http://localhost:3000
npm test                    # 22 tests
```

Requires Node 18.17 or newer. The only dependency is the official Anthropic SDK, which AI captions use. Everything else uses the Node standard library.

Without an Instagram connection, the app runs in **demo mode** with realistic sample data, and the UI labels it as demo everywhere. That way you can try every feature first.

## Connecting real Instagram data

Each user connects their own account in **Settings**:

1. Convert the Instagram account to **Business** or **Creator** and link it to a Facebook Page.
2. Create a Meta app at developers.facebook.com and add **Instagram API with Facebook Login**.
3. Request `instagram_basic`, `pages_show_list` and `instagram_manage_insights`, plus the **Instagram Public Content Access** feature (hashtag search needs Meta app review).
4. Generate a user token, exchange it for a **long-lived token** (60 days), and read your numeric Instagram Business Account ID from `GET /me/accounts?fields=instagram_business_account`.

Tokens are encrypted with AES-256-GCM before storage, using a key derived from `APP_SECRET`.

**Instagram limits respected:** 30 unique hashtags per 7 days per account (tracked and enforced with a clear message), hashtag IDs cached permanently, and responses cached for `CACHE_MINUTES`. The live tracker polls every `LIVE_INTERVAL_SECONDS` (minimum 30).

## How the scores work

**Keyword opportunity (estimate):** phrase specificity (2-5 words rank best), AEO fit (question form, informational intent) and estimated competition (broad terms score harder, while long-tail and local terms score easier). Phrases that people really type (autocomplete) get a bonus.

**Keyword opportunity (live):** `0.35·demand + 0.30·(100 − competition) + 0.15·freshness + 0.10·reel share + 0.10·AEO`, where
- demand = posts in the last 24h (log scale),
- competition = median engagement of the top posts (log scale),
- freshness = share of top posts newer than 7 days.

**Reel trend score:** `engagement / (ageHours + 2)^1.3`, where engagement = likes + 3 × comments. *Breakout* means top 10% and under 48h old.

**Caption audit (100 points):**

| Check | Points |
| --- | --- |
| Keyword in the first 125 characters | 20 |
| Natural keyword use | 10 |
| Related keywords | 10 |
| Question present | 10 |
| Direct answer (8-45 words) | 10 |
| Hashtags (3-5, none banned) | 10 |
| CTA | 8 |
| Length | 8 |
| Short hook | 7 |
| Readability | 7 |

A caption over 2,200 characters is capped at 40.

> Instagram does not publish keyword search volume. InstaRank shows measured signals (live posting activity and engagement) and labels estimates as estimates. It never invents volumes.

## AI captions (optional)

Set `ANTHROPIC_API_KEY` to enable. Captions are generated with Claude (`CLAUDE_MODEL`, default `claude-opus-5-5`) using structured JSON output. Server-side refusal fallback is enabled (`fallbacks: "default"`). Every AI caption is re-scored by the same deterministic auditor. With **"Teach the AI what top Reels do"**, the live patterns for the keyword are included in the brief.

## Billing

Set `STRIPE_LINK_PRO` / `STRIPE_LINK_AGENCY` to Stripe Payment Links. The upgrade button opens checkout with the user's email and ID (`client_reference_id`). After payment, an admin listed in `ADMIN_EMAILS` activates the plan with `POST /api/admin/plan`. For automatic activation, add a Stripe webhook handler. In development, `DEV_ALLOW_SELF_UPGRADE=true` switches plans without payment. **Set it to false in production.**

## Deploying

- Any Node host (Render, Railway, Fly.io, a VPS with PM2). Serve over HTTPS and set `COOKIE_SECURE=true`, `NODE_ENV=production` and a strong `APP_SECRET`.
- Data lives in a JSON file (`DATA_FILE`) with atomic writes. That suits a single instance. `src/db.js` is the only storage module, so you can swap it for Postgres when you scale to multiple instances.

## API

All endpoints are JSON. Mutating requests need the `X-Requested-With: InstaRank` header.

| Method & path | Purpose |
| --- | --- |
| `POST /api/auth/signup` · `/login` · `/logout` | Accounts |
| `GET /api/me` | User, plan, usage |
| `PUT/DELETE /api/settings/instagram` | Connect or disconnect Instagram |
| `GET /api/keywords/research?seed=&location=` | Keyword ideas |
| `POST /api/keywords/analyze {keyword}` | Live keyword metrics + patterns |
| `GET /api/reels/trending?hashtag=` | Ranked Reels + patterns |
| `GET /api/reels/live?hashtags=a,b` | Server-Sent Events live board |
| `GET /api/competitors?username=` | Competitor Reels |
| `POST /api/captions/generate` | SEO/AEO captions (`useAI` for Claude) |
| `POST /api/captions/audit` | Caption score + fixes |
| `GET/POST/DELETE /api/saved` | Saved library |
| `POST /api/billing/upgrade {plan}` | Checkout link or plan switch |

## Project structure

```
server.js            entry point
src/app.js           HTTP server, routes, auth, SSE, static files
src/keywords.js      keyword expansion, intent, estimate + live scoring, hashtag sets
src/trends.js        Reel velocity scoring, pattern extraction, live deltas
src/captions.js      SEO + AEO caption generator and 100-point auditor
src/ai.js            Claude caption writer (optional)
src/instagram.js     Instagram Graph API client with friendly error mapping
src/provider.js      live vs demo data, caching, 30-hashtag/week guard
src/demo.js          deterministic demo data
src/plans.js         plans and monthly quotas
src/security.js      scrypt, AES-256-GCM, rate limiter
src/db.js            JSON document store
public/              single-page app (vanilla JS, responsive, dark mode)
tests/               node:test unit + API tests
```
