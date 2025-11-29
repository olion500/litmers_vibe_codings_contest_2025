# Jira Lite MVP - AI-Powered Issue Tracking

A lightweight, AI-augmented issue tracking web application built with Next.js, PostgreSQL, and Mailpit. Perfect for teams looking for a modern alternative to traditional project management tools.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Common Tasks](#common-tasks)
- [Development Workflow](#development-workflow)
- [Database Management](#database-management)
- [Email Testing](#email-testing)
- [Authentication Setup](#authentication-setup)
- [Troubleshooting](#troubleshooting)

## ✨ Features

### Core Functionality
- **Authentication**: Email/password signup + Google OAuth
- **Team Management**: Create teams, invite members, manage roles (OWNER/ADMIN/MEMBER)
- **Project Management**: Create projects, organize with custom fields
- **Issue Tracking**: Create, update, delete issues with status, priority, labels, due dates
- **Kanban Board**: Drag-and-drop issues between status columns
- **Comments**: Collaborate with comments on issues
- **Activity Logs**: Track team member activities

### AI-Powered Features
- **AI Summary**: Auto-generate issue summaries
- **AI Suggestions**: Get solution suggestions for issues
- **AI Labels**: Auto-recommend labels based on issue content
- **Duplicate Detection**: Identify similar issues

### Additional Features
- **Dashboards**: Personal and project-level dashboards
- **Notifications**: In-app notifications for important events
- **Search & Filter**: Search issues, filter by status/priority/assignee
- **Subtasks**: Break down issues into checklist items
- **Custom Statuses**: Define custom workflow statuses per project

## 🏗️ Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes + Server Actions
- **Database**: PostgreSQL (Docker)
- **ORM**: Prisma
- **Cache & Rate Limiting**: Redis (Docker)
- **Email**: Mailpit (Docker) for local testing
- **Authentication**: NextAuth v5
- **AI**: OpenAI API (optional)
- **Package Manager**: pnpm

## 📦 Prerequisites

Before you begin, ensure you have installed:

- **Node.js** 18+ (https://nodejs.org/)
- **pnpm** (https://pnpm.io/installation) - `npm install -g pnpm`
- **Docker & Docker Compose** (https://docs.docker.com/get-docker/) - for database, Redis, Mailpit

### Verify Installation

```bash
# Check Node version
node --version  # Should be v18+

# Check pnpm version
pnpm --version

# Check Docker
docker --version
docker-compose --version
```

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd litmers_claude

# Install dependencies
pnpm install
```

### 2. Setup Environment Variables

```bash
# Create .env file from template
cp .env.example .env

# Edit .env with your configuration
# At minimum, you need:
# - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)
# - Google OAuth credentials (see Authentication Setup)
```

Generate a secure NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
# Copy the output and paste into NEXTAUTH_SECRET in .env
```

### 3. Start Services

```bash
# Start PostgreSQL, Redis, and Mailpit containers
make start

# Verify services are running
make status

# Expected output should show all containers running
```

### 4. Setup Database

```bash
# Apply database migrations
make prisma-push

# This creates all tables in PostgreSQL
```

### 5. Run Development Server

```bash
# Start the Next.js dev server
make dev

# App will be available at http://localhost:3000
```

### 6. Access the App

- **Frontend**: http://localhost:3000
- **Mailpit (Email Testing)**: http://localhost:8025
- **Database**: Available at `localhost:5432` (user: `app`, password: `app`, database: `jira_lite`)

## 📁 Project Structure

```
litmers_claude/
├── app/                      # Next.js app directory (frontend & API routes)
│   ├── (auth)/              # Authentication pages (login, register, reset-password)
│   ├── api/                 # API routes and server actions
│   │   ├── auth/            # Authentication endpoints
│   │   ├── teams/           # Team management API
│   │   ├── projects/        # Project management API
│   │   ├── issues/          # Issue management API
│   │   ├── comments/        # Comments API
│   │   └── invites/         # Team invite API
│   ├── projects/            # Project pages
│   └── teams/               # Team pages
├── components/              # Reusable React components
│   └── ui/                 # shadcn/ui components
├── lib/                     # Utility functions and helpers
│   ├── mailer.ts           # Email sending service
│   ├── prisma.ts           # Prisma client
│   ├── session.ts          # Session management
│   ├── teams.ts            # Team utilities
│   ├── issues.ts           # Issue utilities
│   ├── validation.ts       # Zod schemas for validation
│   └── password.ts         # Password hashing
├── prisma/                 # Database schema and migrations
│   └── schema.prisma       # Data model definition
├── openspec/               # OpenSpec documentation
│   ├── specs/              # Feature specifications
│   └── changes/            # Change proposals and implementation tracking
├── docker-compose.yml      # Docker services configuration
├── .env.example           # Environment variables template
├── Makefile               # Development tasks
└── package.json           # Dependencies

Key Files:
- auth.ts - NextAuth configuration
- next.config.ts - Next.js configuration
```

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# Application
APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generated-secret>  # Generate with: openssl rand -base64 32

# Database
DATABASE_URL=postgresql://app:app@localhost:5432/jira_lite

# Google OAuth (see Authentication Setup section)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Email Configuration (Mailpit for local development)
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
MAIL_FROM=no-reply@jira-lite.local

# OpenAI (optional, for AI features)
OPENAI_API_KEY=your-openai-api-key
```

### Docker Services (docker-compose.yml)

The project includes three containerized services:

- **PostgreSQL**: Database server (port 5432)
- **Redis**: Cache and rate limiting (port 6379)
- **Mailpit**: Email testing service (SMTP: 1025, UI: 8025)

All services start automatically with `make start`.

## 📚 Common Tasks

### Development

```bash
# Start dev server
make dev

# Run linter
make lint

# Run tests
make test

# Build for production
make build
```

### Database

```bash
# Apply schema changes to database
make prisma-push

# Open database shell (psql)
make db-shell

# View migration status
pnpm prisma migrate status
```

### Docker Services

```bash
# Start all services
make start

# Stop all services
make stop

# View service status
make status

# View service logs
make logs

# View logs for specific service
docker-compose logs postgres  # or redis, mailpit
```

### Quick Commands

```bash
# See all available make targets
make help
```

## 🔧 Development Workflow

### 1. Making Changes

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes
# Code in app/, lib/, components/

# Check for errors
make lint

# Run tests
make test
```

### 2. Testing Changes

```bash
# Start dev server
make dev

# Open http://localhost:3000 in browser
# Test your feature manually

# For database changes:
# 1. Update prisma/schema.prisma
# 2. Run: make prisma-push
# 3. Restart dev server
```

### 3. Committing Changes

```bash
# Check your changes
git status
git diff

# Stage and commit
git add .
git commit -m "feat: description of changes"

# Push to remote
git push origin feature/your-feature-name
```

## 🗄️ Database Management

### Understanding Prisma

Prisma is an ORM (Object-Relational Mapping) that provides:
- Type-safe database access
- Migration management
- Schema visualization

### Working with the Database

```bash
# View database schema
pnpm prisma studio  # Opens browser UI to explore data

# Create a new migration
pnpm prisma migrate dev --name migration_description

# Apply pending migrations
make prisma-push

# Reset database (careful!)
pnpm prisma migrate reset  # WARNING: Deletes all data

# View migration history
pnpm prisma migrate status
```

### Database Schema

Current tables:
- **User**: Login accounts, profiles
- **Team**: Team organizations
- **TeamMember**: Team membership + roles
- **TeamInvite**: Pending team invitations
- **Project**: Projects within teams
- **Issue**: Issues within projects
- **Comment**: Comments on issues
- **Status**: Workflow statuses (Backlog, In Progress, Done)
- **ProjectLabel**: Custom labels for categorization
- **Subtask**: Checklist items within issues
- **PasswordResetToken**: Password reset tokens (1-hour expiration)
- **ActivityLog**: Team activity tracking

## 📧 Email Testing

### Local Email Testing with Mailpit

Mailpit is a lightweight SMTP service for testing emails locally:

1. **Mailpit Web UI**: http://localhost:8025
   - View all sent emails
   - Check email content, headers, attachments

2. **When You Send Emails** (e.g., password reset, team invites):
   - Email appears in Mailpit UI instantly
   - Click email to view HTML content
   - Click links in emails to test

### Email Workflows

**Password Reset Email**:
1. User clicks "Forgot password?" on login page
2. Enter email → System sends reset email
3. Check Mailpit for email with reset link
4. Click link to reset password

**Team Invitation Email**:
1. Team owner/admin invites someone
2. Invitee receives email
3. Click link to accept invite or create account
4. User auto-joins team after signup

### Configuration

Default Mailpit settings in `.env`:
```
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
MAIL_FROM=no-reply@jira-lite.local
```

No changes needed for local development!

## 🔐 Authentication Setup

### Email/Password Authentication

Already configured! Just use the signup page.

### Google OAuth

Required for "Sign in with Google" feature. Follows these steps:

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Create a new project (top left, click project selector)
   - Project name: "Jira Lite" (or your choice)
   - Click "Create"

#### Step 2: Enable OAuth API

1. In Cloud Console, go to **APIs & Services** → **OAuth consent screen**
2. Select "External" user type
3. Click "Create"
4. Fill in consent screen:
   - App name: "Jira Lite Local"
   - User support email: Your email
   - Developer contact: Your email
5. Click "Save and Continue"
6. Skip "Scopes" (optional), click "Save and Continue"
7. Skip "Test users" (only needed for production), click "Save and Continue"
8. Click "Back to Dashboard"

#### Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth Client ID**
3. Application type: **Web application**
4. Authorized JavaScript origins:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000` (optional, for 127.0.0.1 access)
5. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `http://127.0.0.1:3000/api/auth/callback/google` (optional)
6. Click "Create"
7. Copy the credentials shown

#### Step 4: Add to .env

```bash
# Copy from Step 3
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
```

#### Step 5: Restart Dev Server

```bash
# Ctrl+C to stop current server
# Restart:
make dev

# Google OAuth should now work!
```

### Using Different Port

If you run on port 3001 instead of 3000:

1. Add to Google OAuth Credentials:
   - Origins: `http://localhost:3001`
   - Redirect URI: `http://localhost:3001/api/auth/callback/google`
2. Update `.env`:
   ```
   APP_URL=http://localhost:3001
   NEXTAUTH_URL=http://localhost:3001
   ```
3. Start dev server on 3001:
   ```bash
   pnpm dev -- -p 3001
   ```

## 🚢 Deployment

### Building for Production

```bash
# Build production bundle
make build

# This creates an optimized Next.js build in .next/
# Checks all TypeScript types
# Minifies JavaScript and CSS
```

### Deploying

You can deploy to:
- **Vercel** (recommended for Next.js) - https://vercel.com
- **Netlify** - https://netlify.com
- **Render** - https://render.com
- **Railway** - https://railway.app
- **Self-hosted** (any server with Node.js)

#### Example: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts to connect your Git repo
# Vercel will auto-detect Next.js and deploy
```

#### Production Environment

For production, you'll need:
- Database: PostgreSQL (use managed service like Neon, Railway, etc.)
- Email: Real email service (SendGrid, AWS SES, etc.)
- OAuth: Update Google credentials for production domain
- Secrets: Keep API keys secure in production environment variables

## 🧪 Testing & Building

### Run Tests

```bash
# Run all tests
make test

# Run in watch mode (auto-rerun on changes)
make test-watch

# Or with pnpm directly
pnpm test
```

### Build Checks

```bash
# Type check
npx tsc --noEmit

# Lint check
make lint

# Build check
make build
```

### Pre-Commit Checklist

Before committing:
```bash
make lint    # Fix any linting issues
make test    # Ensure tests pass
make build   # Verify production build works
```

## 🐛 Troubleshooting

### "Cannot connect to database"

```bash
# Check if PostgreSQL is running
make status

# Should show postgres as "Up"

# If not running:
make start

# Check logs:
docker-compose logs postgres
```

### "Port already in use"

```bash
# Port 3000 (dev server), 5432 (Postgres), 6379 (Redis), 1025 (Mailpit)

# Kill process on port (Linux/Mac):
lsof -i :3000
kill -9 <PID>

# Or restart Docker:
make stop
make start
```

### "Prisma schema out of sync"

```bash
# After changing prisma/schema.prisma:
make prisma-push

# Restart dev server:
# Ctrl+C then: make dev
```

### "Google OAuth not working"

Check `.env`:
- [ ] `GOOGLE_CLIENT_ID` is correct
- [ ] `GOOGLE_CLIENT_SECRET` is correct
- [ ] `NEXTAUTH_URL=http://localhost:3000`
- [ ] Dev server restarted after changing `.env`

### "Emails not appearing in Mailpit"

1. Check Mailpit is running:
   ```bash
   make status  # Should show mailpit as Up
   ```

2. Check Mailpit UI: http://localhost:8025

3. Check `SMTP_HOST` and `SMTP_PORT` in `.env`:
   ```
   SMTP_HOST=127.0.0.1  # NOT localhost
   SMTP_PORT=1025
   ```

4. Check logs:
   ```bash
   make logs
   ```

### "TypeScript errors after pulling code"

```bash
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Update Prisma types
pnpm prisma generate

# Restart dev server
make dev
```

### "pnpm command not found"

```bash
# Install pnpm globally
npm install -g pnpm

# Verify
pnpm --version
```

## 📖 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 💬 Support

If you encounter issues:

1. Check [Troubleshooting](#troubleshooting) section above
2. Check existing GitHub issues
3. Review Docker logs: `make logs`
4. Check `.env` configuration
5. Try restarting services: `make stop && make start`

## 📝 License

This project is provided as-is for educational and development purposes.

---

**Happy Building! 🎉**

For detailed implementation information, see the OpenSpec documentation in `openspec/changes/` directory.
