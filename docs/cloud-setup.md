# Cloud setup (Supabase)

Cloud designs (sign-in, sync, sharing) are optional. Without the two `NEXT_PUBLIC_SUPABASE_*` values the app runs exactly as before, with every cloud button hidden.

Never commit `.env.local` or `.env.test.local`; both are git-ignored. `.env.example` lists every variable.

## 1. Connect the app (`.env.local`)

1. Open the Supabase dashboard for the real project, then **Project Settings > API**.
2. Copy **Project URL** and the **anon public** key into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```
3. Restart `npm run dev`.

## 2. Create the database objects (real project)

1. In the dashboard, open **Account > Access Tokens** and create a personal access token.
2. Log the CLI in and link the project:
   ```
   npx supabase login
   npx supabase link --project-ref eavudkqpteddgefhpxck
   ```
   It asks for the database password (Project Settings > Database).
3. Apply the migrations in `supabase/migrations`:
   ```
   npm run db:push
   ```
   Run this again whenever a new migration file is added.

## 3. Test project (`.env.test.local`)

The integration tests create and delete throwaway users, so they run against a separate, disposable project, never the real one.

1. Create a second free project named `kalendario-test`.
2. From its **Project Settings > API**, put these in `.env.test.local`:
   ```
   TEST_SUPABASE_URL=https://<test-ref>.supabase.co
   TEST_SUPABASE_ANON_KEY=<anon key>
   TEST_SUPABASE_SERVICE_KEY=<service_role key>
   TEST_SUPABASE_DB_PASSWORD=<database password>
   TEST_SUPABASE_DB_URL=<session pooler connection string>
   ```
   Get the connection string from **Connect > Session pooler** (the direct `db.<ref>.supabase.co` host is IPv6-only and often unreachable). Put the real password in it, percent-encoded if it has special characters.
3. Push the migrations there too, without linking:
   ```
   npx supabase db push --db-url "<TEST_SUPABASE_DB_URL>"
   ```
4. Run the tests: `npm run test:cloud`.

## 4. Auth settings (both projects)

In **Authentication > Sign In / Providers** and **URL Configuration**:

1. Keep **Confirm email** on. Shared designs only open for confirmed accounts.
2. Site URL: `http://localhost:3100`.
3. Redirect URLs: add `http://localhost:3100/auth/callback` (and the production URL's `/auth/callback` once deployed).

## 5. Google sign-in (later)

Create an OAuth client in Google Cloud Console with redirect `https://<ref>.supabase.co/auth/v1/callback`, then paste its client ID and secret into **Authentication > Providers > Google**.

## 6. Custom email sender (optional)

Supabase's built-in mailer is rate-limited. For real use, add Resend (or any SMTP) under **Authentication > Emails > SMTP Settings**.

## 7. Vercel (Task 11)

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the Vercel project's environment variables, and add the production `/auth/callback` URL to the redirect list.
