# CampusTalk MVP

Verified University-only random video chat (MVP)

## Overview

This project is a minimal MVP using Next.js (frontend + API routes) and Supabase (Auth, Postgres, Realtime).
It implements domain-based university verification, a waiting queue, a simple matching Edge Function, and
signalling via a `signals` table for WebRTC SDP/ICE exchange (P2P using STUN).

## Files

- `pages/` - Next.js pages:
  - `index.js` - login/register UI
  - `video.js` - main video/chat page
  - `api/university.js` - checks university domain
- `components/` - small React components (RegisterModal)
- `lib/supabaseClient.js` - Supabase client helper
- `supabase/schema.sql` - DB schema to run in Supabase SQL editor
- `supabase/seed_universities.sql` - sample universities seed
- `supabase_functions/match-attempt/index.ts` - Supabase Edge Function for matching
- `.env.local.example` - example env vars

## Quick local run (dev)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` in project root with values from Supabase:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

3. Run dev server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## Supabase setup (brief)

1. Create a Supabase project and run `supabase/schema.sql` and `supabase/seed_universities.sql` in SQL Editor.
2. Configure Auth (email confirmations).
3. Deploy `match-attempt` Edge Function (see `supabase_functions/match-attempt/index.ts`) and set `SUPABASE_SERVICE_ROLE_KEY` env for the function.
4. Provide `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.

## Notes

- This is a functional MVP. It uses STUN only (no TURN) — expect NAT failures for some users.
- Signalling uses the `signals` table and Supabase Realtime subscriptions.
- Harden RLS and secrets before production.
