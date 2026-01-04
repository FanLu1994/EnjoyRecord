# EnjoyRecord

A personal media tracking application for recording books, films, series, and games.

## Features

- Track multiple media types: books, films, series, games
- Star rating system (0-10)
- Progress tracking (pages, chapters, episodes, hours)
- Status management (planned, in progress, completed, paused)
- Search and import from NeoDB
- Terminal-style UI

## Tech Stack

- **Framework**: Next.js 16
- **Database**: SQLite (node:sqlite)
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI
- **Language**: TypeScript

## Getting Started

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

- `ENJOYRECORD_ADMIN_PASSWORD`: Optional admin password for protected actions (sync, create, update, delete).

## Project Structure

```
src/
├── app/           # Next.js app router
├── components/    # React components
└── lib/           # Utilities and database
```

## License

MIT
