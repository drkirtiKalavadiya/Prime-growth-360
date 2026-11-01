# Prime Growth 360 — Premium Habit Tracker

A habit tracker anyone can use with no sign-up or install. Track your whole day, earn reward points, level up, unlock badges and play circle games.

**Run it:** open `index.html` in any browser, or host the folder on any static host (GitHub Pages, Netlify, etc.).
On a phone you can use “Add to Home Screen”: it installs as an app and works offline.

## Features

### 📅 Whole-day tracking
- Habits grouped by **Morning / Afternoon / Evening / Night / Anytime**
- **Circular progress rings** for each habit and a big ring that shows how much of the day is done
- Habits you do several times a day (e.g. 3×) and habits for chosen weekdays only
- Daily **water** (8 glasses), **sleep** hours, **mood**, **steps** and a **day journal**
- Go back to earlier days to fill in what you missed

### ★ Reward points & levels
| Action | Points |
|---|---|
| Complete a habit | habit's own value (you set 1–100) |
| Perfect day (all habits done) | +20 |
| Hydration goal (8 glasses) | +5 |
| Streak milestones (3 / 7 / 14 / 30 / 100 days) | +15 / +40 / +80 / +200 / +750 |
| Welcome bonus | +10 |

- Unticking a habit takes its points back, so the score can't be gamed
- XP gives you **levels** (Beginner → Prime 360)
- **Reward Store**: make your own rewards (snack, movie night…) and spend points on them
- **13 badges** to unlock and a full points history

### ◎ Circle games
- **🎡 Lucky Spin Wheel**: one free spin a day; extra spins cost 15 ★
- **⭕ Ring Rush**: tap the shrinking circles inside a round arena for 30 seconds (gold circles = 3×). The first 3 games each day earn points.
- **🎯 Perfect Circle Timer**: stop the moving dot inside the gold zone of the ring. Up to 5 rewarded hits a day.

### 🔒 Private
All data stays in your browser (localStorage). Export or import a JSON backup from the **Stats** tab.

## Files
- `index.html`: app layout
- `styles.css`: premium dark and light themes
- `app.js`: all app logic, with no dependencies
- `sw.js`, `manifest.webmanifest`, `icon.svg`: installable PWA and offline support
