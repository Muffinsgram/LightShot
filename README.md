# LightShot Clone

A modern, secure, and self-hosted alternative to Lightshot. Control your data, keep screenshots for 7 days, and automatically clean them up. 

## Features
- Web Dashboard to manage your screenshots
- Secure, unguessable short links
- 7-day automatic deletion (Vercel Cron)
- Tauri-based Windows Desktop App with Global Shortcuts
- Rate-limiting ready (Supabase RLS & Auth)

## Architecture
- **Web App**: Next.js App Router, Tailwind CSS, Supabase SSR
- **Database & Storage**: Supabase (PostgreSQL, Storage, Auth)
- **Desktop App**: Tauri v2, React, Rust
- **Hosting**: Vercel

## Setup Instructions

### 1. Supabase Setup
1. Create a new Supabase project.
2. Go to the SQL Editor and run the script in `schema.sql`.
3. Go to Storage and create a bucket named `screenshots`. Keep it **Private**.

### 2. Web App (.env)
Copy `.env.example` to `.env.local` inside the `/web` folder and fill in the values:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=my_secure_cron_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
Run `npm install` then `npm run dev` in the `/web` directory.

### 3. Desktop App (Tauri)
1. Install Rust (`cargo`) and Tauri prerequisites for Windows.
2. Inside the `/desktop` folder, run `npm install`.
3. Add the following line to `src-tauri/tauri.conf.json` if needed to enable plugins, or use `tauri config`.
4. Run `npm run tauri dev` to test the desktop application.
5. In the desktop app, paste your Access Token (which you can inspect via your browser cookies or add a UI for it in the dashboard).
6. Press `Ctrl+Shift+S` to capture your screen, or click the button.
7. Click "Upload & Copy Link".

### 4. 7-Day Cleanup (Vercel Cron)
When deploying to Vercel, the `vercel.json` file configures a daily cron job that hits `/api/cron/cleanup`. It securely checks the `CRON_SECRET` and deletes all screenshots older than 7 days from both Supabase Storage and the Database.

### Security Notes
- **Row Level Security (RLS)** ensures users can only see and delete their own screenshots on the dashboard.
- **Service Role Key** is only used server-side in the web application (API routes and Cron) to securely generate signed URLs and delete files.
- Desktop App uses the **Bearer Token** to authenticate securely with the Next.js API.

### Free-Tier Limitations
- Vercel Hobby allows 1 cron job per day.
- Supabase Free limits storage (1GB) and DB (500MB).
- Upload endpoint enforces a strict 10MB limit and only allows specific image types to prevent abuse.
# LightShot
# LightShot
