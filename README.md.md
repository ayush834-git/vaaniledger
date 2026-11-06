# VaaniLedger

**A voice-first AI financial assistant.** Speak to log and understand your money, in your own language.

🌐 **Live demo:** [vaaniledger.vercel.app](https://vaaniledger.vercel.app)

> *Vaani* (वाणी) means "voice" in Hindi.

<!-- TODO: add a screenshot or GIF of the app here -->
<!-- ![VaaniLedger screenshot](public/screenshot.png) -->

---

## Who Is It For?

VaaniLedger is built for people who find typing numbers into spreadsheets or finance apps slow, tedious, or inaccessible:

- **Everyday users and students** who want to track daily spending without the friction of forms and dropdowns
- **Small shopkeepers, freelancers, and gig workers** who handle money on the go and have their hands full
- **Non-English speakers** who are more comfortable saying "maine aaj 200 rupaye chai pe kharch kiye" than navigating an English-only interface
- **First-time budgeters and people new to smartphones**, for whom a spoken conversation is easier than a dashboard
- **Developers** who want a reference for a voice-first, multilingual Next.js + Prisma + LLM app

<!-- TODO: confirm and tighten your real target audience -->

## Why VaaniLedger?

Most money-tracking apps share the same problems:

| Problem | How VaaniLedger approaches it |
|---|---|
| Logging every expense by hand is tedious, so people quit after a week | Say it out loud and the assistant records it |
| Most apps are English-first, leaving millions of users behind | Built-in i18n with locale files, so the interface and assistant can speak your language |
| Spreadsheets and charts are intimidating | Ask plain questions like "how much did I spend on food this month?" |
| Reports are hard to share with an accountant, family, or lender | Export a PDF report, or receive it by email |
| Finance apps feel heavy and need installs | Installable PWA that works from the browser |

The core idea: **talking is the fastest, most natural interface people already have.** The ledger should adapt to the user, not the other way round.

## What Can It Do?

### 1. Record transactions by voice
Speak naturally ("Paid 500 for groceries", "Got 20,000 salary today") and the assistant turns it into a structured ledger entry: amount, category, and date.

### 2. Answer questions about your money
Ask in plain language, such as spending by category, totals for a period, or recent transactions, and get a clear answer instead of digging through tables.

### 3. Visualize spending
Charts and summaries show where your money goes, so trends are easy to spot at a glance.

### 4. Work in your language
The interface and assistant support multiple languages through translation files in `/locales`, and new languages can be added without touching core code.

### 5. Generate PDF reports
Export your ledger or a summary as a downloadable PDF to keep, print, or share.

### 6. Send reports and notifications by email
Email support (via Nodemailer) lets the app deliver sign-in links and reports.

### 7. Keep your data private and synced
Sign in securely with NextAuth, with your data stored per user in your database, so it is available across devices.

### 8. Install like an app
As a PWA, VaaniLedger can be added to your home screen and launched like a native app.

<!-- TODO: remove or edit any capability above that isn't implemented yet,
     and add anything I couldn't see (budgets, reminders, categories, etc.) -->

## How It Works

```
 🎙️ Voice input  →  📝 Speech-to-text  →  🤖 LLM (Groq / Gemini)
                                              │  understands intent
                                              ▼
                    📒 Structured entry / answer  →  🗄️ Prisma + PostgreSQL
                                              │
                                              ▼
                       📊 Charts · 📄 PDF · ✉️ Email · 🔊 Response
```

1. You speak or type a request.
2. Speech is converted to text.
3. The configured LLM (`AI_PROVIDER=groq` or `gemini`) interprets the intent: add a transaction, ask a question, or request a report.
4. The app validates the result (Zod), saves it to the database, and shows the outcome.

<!-- TODO: adjust the flow to match your actual implementation -->

## Features

- 🎙️ **Voice-first interface**: talk to your ledger instead of typing
- 🤖 **AI-powered assistant**: pluggable LLM backend (Groq or Gemini)
- 🌍 **Multilingual**: i18n support with locale files in `/locales`
- 📊 **Visual insights**: charts and spending summaries built with Recharts
- 📄 **PDF export**: generate downloadable reports with PDFKit
- ✉️ **Email**: email sign-in and notifications via Nodemailer
- 🔐 **Authentication**: NextAuth with a Prisma adapter
- 📱 **Installable PWA**: works like a native app on mobile

<!-- TODO: trim or edit this list so it matches exactly what's shipped -->

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, Framer Motion, Radix UI, Lucide icons |
| Database / ORM | PostgreSQL via [Prisma](https://www.prisma.io/), Supabase |
| Auth | NextAuth.js (`@auth/prisma-adapter`) |
| AI | Groq or Google Gemini (selected with `AI_PROVIDER`) |
| i18n | i18next, react-i18next |
| Charts | Recharts |
| PDF / Email | PDFKit, Nodemailer |
| PWA | next-pwa |
| Validation | Zod |
| Deployment | Vercel |

## Project Structure

```
vaaniledger/
├── app/          # Next.js routes, pages, and API handlers
├── components/   # Reusable UI components
├── lib/          # Helpers: AI clients, DB, auth, utilities
├── locales/      # Translation files
├── prisma/       # Database schema and migrations
├── public/       # Static assets and PWA files
├── styles/       # Global styles
└── update_locales.js   # Script for syncing translation files
```

## Getting Started

### Prerequisites

- Node.js 18.17+ (20+ recommended)
- npm
- A PostgreSQL database (a [Supabase](https://supabase.com/) project works well)
- An API key for [Groq](https://console.groq.com/) or [Google AI Studio (Gemini)](https://aistudio.google.com/)
- SMTP credentials if you want email features

### 1. Clone and install

```bash
git clone https://github.com/ayush834-git/vaaniledger.git
cd vaaniledger
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Then fill in `.env.local`:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL (server-side) |
| `SUPABASE_ANON_KEY` | Supabase anon key (server-side) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client-side) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-side) |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |
| `NEXTAUTH_SECRET` | Random secret for NextAuth (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App URL, `http://localhost:3000` in development |
| `AI_PROVIDER` | `groq` or `gemini` |
| `GROQ_API_KEY` | Required when `AI_PROVIDER=groq` |
| `GEMINI_API_KEY` | Required when `AI_PROVIDER=gemini` |
| `EMAIL_SERVER_HOST` | SMTP host |
| `EMAIL_SERVER_PORT` | SMTP port |
| `EMAIL_SERVER_USER` | SMTP username |
| `EMAIL_SERVER_PASSWORD` | SMTP password |
| `EMAIL_FROM` | "From" address for outgoing email |

> ⚠️ Never commit `.env.local`. Only `.env.local.example` belongs in the repo.

### 3. Set up the database

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Voice input tip:** the browser microphone API needs a secure context. `localhost` works, and deployed builds must be served over HTTPS. Chrome and Edge have the best speech-recognition support.

## Available Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm start` | Run the production build |
| `npm run lint` | Lint with ESLint |
| `npm run typecheck` | Type-check with `tsc --noEmit` |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:migrate` | Create and apply a dev migration |
| `npm run prisma:studio` | Open Prisma Studio to browse data |

## Adding a Language

1. Copy an existing file in `locales/` and translate the values.
2. Register the new language in your i18n config.
3. Run `node update_locales.js` to keep keys in sync across locale files.

<!-- TODO: confirm these steps match your actual i18n setup -->

## Deployment

The app is deployed on [Vercel](https://vercel.com/).

1. Import the repo into Vercel.
2. Add every variable from the table above in **Project Settings → Environment Variables**.
3. Set `NEXTAUTH_URL` to your production URL.
4. Deploy. The build script runs `prisma generate` automatically.

## Roadmap

<!-- TODO: replace with your real plans -->
- [ ] More supported languages
- [ ] Budgets and spending alerts
- [ ] Offline support for the PWA

## Contributing

Contributions are welcome. Fork the repo, create a feature branch, and open a pull request. Please run `npm run lint` and `npm run typecheck` before submitting.

## License

<!-- package.json currently says ISC; add a LICENSE file to match -->
Distributed under the ISC License.

---

Built by [@ayush834-git](https://github.com/ayush834-git)
