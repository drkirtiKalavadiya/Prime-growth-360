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
reel/               Story Reel Studio: animated 9:16 marketing reel with video export (see reel/README.md)
```

## Development

No build step and no dependencies. Run the tests with Node 18+:

```bash
node --test tests/*.test.js
```

## Notes and limitations
- Data lives in the browser's local storage, so clearing browser data erases it. Use the backup feature.
- Each browser or device keeps its own data. Sharing data across a team in real time would need a backend, which is a possible next step.
