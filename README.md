# Jira Lite MVP - AI-Powered Issue Tracking

A lightweight issue tracking app built with Next.js, PostgreSQL, and Docker.

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ (https://nodejs.org/)
- pnpm (`npm install -g pnpm`)
- Docker & Docker Compose (https://docs.docker.com/get-docker/)

### Setup
```bash
git clone <repo-url>
cd litmers_claude
make setup
```

This will:
1. Install dependencies
2. Create `.env` file
3. Start Docker services (PostgreSQL, Redis, Mailpit)
4. Apply database migrations

### Start Developing
```bash
make dev
```

Open http://localhost:3000 in your browser.

## Available Commands

```bash
make help       # Show all commands
make setup      # One-time setup
make dev        # Start dev server
make build      # Build for production
make start      # Start Docker services
make stop       # Stop Docker services
make logs       # View service logs
make lint       # Check code style
make test       # Run tests
make clean      # Clean dependencies
```

## What You Need to Know

### Emails (Mailpit)
Emails are sent locally to Mailpit for testing:
- **UI**: http://localhost:8025
- Triggered on: password reset, team invitations
- Check Mailpit to see sent emails

### Environment Setup
Edit `.env` file after setup:
```bash
# Required
NEXTAUTH_SECRET=generate with: openssl rand -base64 32
GOOGLE_CLIENT_ID=your-google-id
GOOGLE_CLIENT_SECRET=your-google-secret

# Already set for local dev
DATABASE_URL=postgresql://app:app@localhost:5432/jira_lite
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
```

### Google OAuth Setup
1. Go to https://console.cloud.google.com/
2. Create new project
3. Enable OAuth consent screen
4. Create OAuth Client ID (Web application)
5. Add authorized origins: `http://localhost:3000`
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Copy credentials to `.env`

## Project Structure

```
app/              # Frontend + API routes
├── (auth)/       # Login/Register pages
├── api/          # API endpoints
└── projects/     # Project pages

components/       # React components (shadcn/ui)
lib/              # Utilities (database, auth, email)
prisma/           # Database schema
openspec/         # Feature specifications
docker-compose.yml # Services config
```

## Features

### Core
- Email/password + Google OAuth authentication
- Teams with roles (OWNER, ADMIN, MEMBER)
- Projects with issue tracking
- Kanban board with drag-and-drop
- Comments on issues
- Activity logs

### AI Features (Optional)
- Auto-generate issue summaries
- Get solution suggestions
- Auto-recommend labels
- Detect duplicate issues

## Troubleshooting

### "Cannot connect to database"
```bash
make status      # Check if services are running
make start       # Start them if stopped
```

### "Port already in use"
```bash
make stop        # Stop Docker services
# Or kill the specific process
lsof -i :3000
kill -9 <PID>
```

### "TypeScript/Build errors after pulling code"
```bash
make clean       # Reinstall dependencies
make dev         # Restart dev server
```

### "Emails not appearing in Mailpit"
1. Check `.env`: `SMTP_HOST=127.0.0.1` (not localhost)
2. Check Mailpit running: `make status`
3. View logs: `make logs`

### "Google OAuth not working"
- Verify `.env` has correct credentials
- Restart dev server after changing `.env`
- Check OAuth credentials in Google Cloud Console

## Database

The database schema is defined in `prisma/schema.prisma`.

Key tables:
- `User` - Login accounts
- `Team` - Team organizations
- `TeamMember` - Team membership with roles
- `Project` - Projects within teams
- `Issue` - Issues within projects
- `Comment` - Comments on issues
- `Status` - Workflow statuses (Backlog, In Progress, Done)

## Useful pnpm Commands

```bash
pnpm install          # Install dependencies
pnpm dev             # Start dev server
pnpm build           # Build for production
pnpm start           # Start production server
pnpm lint            # Run ESLint
pnpm test            # Run tests
pnpm prisma studio   # Open Prisma Studio (visual database editor)
pnpm prisma db push  # Apply schema changes to database
```

## Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes** in `app/`, `components/`, `lib/`

3. **Check code quality**
   ```bash
   make lint  # Fix style issues
   make test  # Run tests
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: description"
   git push origin feature/your-feature
   ```

## Deployment

Build for production:
```bash
make build
```

Deploy to:
- **Vercel** (recommended) - https://vercel.com
- **Netlify** - https://netlify.com
- **Railway** - https://railway.app
- **Self-hosted** - any server with Node.js

For production you'll need:
- PostgreSQL database (use managed service)
- Real email service (SendGrid, AWS SES, etc.)
- Update Google OAuth credentials for your domain

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes + Server Actions
- **Database**: PostgreSQL
- **Cache**: Redis
- **Email**: Mailpit (local) / Your choice (production)
- **Auth**: NextAuth v5
- **Package Manager**: pnpm

## Need Help?

1. Check troubleshooting section above
2. Read detailed docs in `openspec/` directory
3. Check project issues on GitHub

---

Happy coding! 🎉
