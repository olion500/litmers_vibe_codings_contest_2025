This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Google OAuth (local-only)

1) Go to https://console.cloud.google.com/apis/credentials (sign in with your Google account).
2) Create a new project (or select an existing local/dev project).
3) In “OAuth consent screen”, set User type to External → fill app name/email → add `http://localhost:3000` to authorized domains (via “Add domain”: `localhost`).
4) Create OAuth Client ID → choose “Web application”.
5) Authorized redirect URIs: add `http://localhost:3000/api/auth/callback/google` (and add `http://127.0.0.1:3000/api/auth/callback/google` if you sometimes use 127.0.0.1). Save.
6) Copy the generated **Client ID** and **Client Secret** into `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Restart `pnpm dev`/`pnpm start` after updating env.

If you run on a different port (e.g., 3001), add corresponding redirect URIs like `http://localhost:3001/api/auth/callback/google` as well.
