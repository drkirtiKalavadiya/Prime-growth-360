# Prime Growth 360 CRM

A simple, free CRM for **MSMEs and small businesses of any kind**: shops, manufacturers, traders, agencies, clinics, coaching centres, real-estate firms and service providers.

It runs entirely in the web browser. There is nothing to install, no server and no monthly fee. Your data stays on your device.

## Features

| Module | What it does |
| --- | --- |
| **Dashboard** | Contacts, open pipeline value, win rate, this month's revenue, outstanding payments, follow-ups due, pipeline chart and recent interactions |
| **Contacts** | Customers, leads, vendors and partners with phone, email, GSTIN, city, lead source, tags and notes. Search and filter. One-tap **Call / WhatsApp / Email** |
| **Contact profile** | Full history: interactions timeline, follow-ups, deals, invoices, lifetime value and amount due |
| **Sales pipeline** | Kanban board with drag-and-drop. Stages are fully customisable, with ready-made presets per industry |
| **Follow-ups & tasks** | Reminders with due dates and priority. Filters for Today, Overdue and Done, plus an overdue badge in the menu |
| **Invoices & quotations** | GST-ready invoices with CGST/SGST split, discount, auto-numbering and status (Draft, Quotation, Sent, Paid, Overdue). **Print / save as PDF** or **send on WhatsApp** |
| **Products & services** | Catalogue with SKU, HSN/SAC, price, unit and stock (low-stock highlight). Add items to invoices in one click |
| **Import / export** | Import contacts from CSV (Excel / Google Contacts). Export contacts and invoices to CSV. Full JSON backup and restore |
| **Settings** | Business profile, GSTIN, currency (INR/USD/EUR/GBP/AED), tax rate, invoice prefix, WhatsApp country code |

### Industry pipeline presets
General · Retail / Shop · Manufacturing · Services / Agency · Healthcare / Clinic · Education / Coaching · Real Estate · Trading / Wholesale

## How to use

1. **Open `index.html`** in Chrome, Edge, Firefox or Safari. Double-clicking the file works.
2. On the dashboard, click **Load demo data** to try it out, or go straight to **Settings** to enter your business details.
3. Add contacts, create deals, set follow-ups and raise invoices.
4. **Back up regularly:** Settings → *Download backup*. Restore the file on any other computer or phone.

### Put it online for free (GitHub Pages)
Repository → **Settings → Pages** → Source: *Deploy from a branch* → choose the branch and `/ (root)` → Save. The CRM will then be live at `https://<username>.github.io/<repo>/`. Each person's data is still stored only in their own browser.

### Importing contacts from Excel
Save your sheet as **CSV**. The first row must contain headers, and a `Name` column is required. The importer recognises these columns: `Company`, `Phone`/`Mobile`, `Email`, `City`, `Type`, `Source`, `GSTIN`, `Address`, `Tags` and `Notes`.

## Project structure

```
index.html          App shell and navigation
css/styles.css      Styles (responsive, dark mode, print layout for invoices)
js/utils.js         Pure helpers: money formatting, invoice/GST maths, CSV, dates
js/store.js         Data layer (localStorage), industry presets, demo data
js/app.js           Views, forms, router and actions
tests/              Unit tests for the business logic
```

## Story reel: "જીવન જીવવા માટે છે" (`story/`)

An animated Gujarati moral story in 9:16 reel format, synced to the voice-over in `story/audio/voiceover.mp3`. It tells the grain sack story: the birds take only what they need, while the man hoards everything. It ends with a Prime Growth 360 promo for the AI Video Creation course. All artwork is original inline SVG, using the same character, sack and birds in every scene.

- **Watch:** open `story/index.html` and press ▶. Use ⏮/⏭, the scene dots or the ←/→ keys to move between scenes, Space to pause and M to mute.
- **URL options:**
  - `?scene=N` jumps to scene N.
  - `?record` hides the controls, for screen recording.
  - `?clean` leaves the ending's centre panel empty, so a logo and promo text can be added later in an editor.
- **Export MP4 (1080×1920, 30 fps, with voice-over):**
  ```bash
  node story/render.mjs story/story.mp4          # add --clean for an empty logo area
  node story/render.mjs --stills 5,40,110        # PNG stills at those seconds
  ```
  This needs Playwright with Chromium, and ffmpeg.
- **Music, sound effects and fast cuts:**
  - **Music:** the background score is composed in code, so it's royalty-free. Its mood follows the story: calm, tense, sparse, hopeful, uplifting, then the promo beat.
  - **Sound effects:** also generated in code: truck, thud, grain, birds, wings, footsteps, clock, pages, coins, heartbeat, door, chime, riser and impact, and typing.
  - **Mix:** music and effects are mixed under the voice-over with automatic ducking and loudness-normalised to −14 LUFS.
  - **Rebuild the soundtrack:** run `node story/build-audio.mjs`. This writes `story/audio/mix.mp3`, which the page and the MP4 export both use.
  - **Adjust levels:** for example `MUSIC_DB=-11 SFX_DB=-6 node story/build-audio.mjs`.
- **Timing:** everything is timed in seconds of the voice-over.
  - `story/timeline.js` holds the scene start times, the camera cuts (fast wide/medium/close-up shots), the sound-effect cues and the music sections.
  - `CUES` in `story/story.js` holds the caption lines.
  - If you replace the voice-over MP3, update those numbers and rebuild the soundtrack.

## Development

No build step and no dependencies. Run the tests with Node 18+:

```bash
node --test tests/*.test.js
```

## Notes and limitations
- Data lives in the browser's local storage, so clearing browser data erases it. Use the backup feature.
- Each browser or device keeps its own data. Sharing data across a team in real time would need a backend, which is a possible next step.
