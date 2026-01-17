# EnjoyRecord

A personal media tracking application for recording books, films, series, and games.

![Deploy with Vercel](https://vercel.com/button)

## Features

- Track multiple media types: books, films, series, games
- Star rating system (0-10)
- Progress tracking (pages, chapters, episodes, hours)
- Status management (planned, in progress, completed, paused)
- Search and import from NeoDB
- Terminal-style UI
- Support for SQLite and PostgreSQL databases

## Tech Stack

- **Framework**: Next.js 16
- **Database**: SQLite (node:sqlite) or PostgreSQL (pg)
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI
- **Language**: TypeScript

## Getting Started

### Local Development with SQLite (Default)

```bash
# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

### Using PostgreSQL

Set the following in your `.env` file:

```env
DATABASE_TYPE=pgsql
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ENJOYRECORD_ADMIN_PASSWORD` | No | Admin password for protected actions (sync, create, update, delete) |
| `DATABASE_TYPE` | No | Database type: `sqlite` (default) or `pgsql` |
| `DATABASE_URL` | Yes* | PostgreSQL connection URL (required when `DATABASE_TYPE=pgsql`) |

## Deployment

### Deploy on Vercel

The easiest way to deploy is using [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FFanLu1994%2FEnjoyRecord&env=DATABASE_TYPE&env=DATABASE_URL&env=ENJOYRECORD_ADMIN_PASSWORD&project-name=enjoyrecord&repository-name=EnjoyRecord)

#### Manual Deployment

1. Fork this repository
2. Import to Vercel
3. Configure environment variables:
   - `DATABASE_TYPE`: Set to `pgsql` (recommended for Vercel)
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `ENJOYRECORD_ADMIN_PASSWORD`: Optional admin password

#### Using Vercel Postgres

1. Create a new project on Vercel
2. Add Vercel Postgres database
3. Use the provided `DATABASE_URL` in your environment variables
4. Set `DATABASE_TYPE=pgsql`

### Docker Deployment

```bash
docker build -t enjoyrecord .
docker run -p 3000:3000 \
  -e DATABASE_TYPE=pgsql \
  -e DATABASE_URL=postgresql://user:password@host:5432/db \
  enjoyrecord
```

## Project Structure

```
src/
├── app/           # Next.js app router
├── components/    # React components
└── lib/           # Utilities and database
```

## License

MIT
