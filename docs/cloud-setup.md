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

The account limits (50 MB of photos, 50 designs, 5 MB per photo) live in two places: the SQL function `app_limits()` (plus the photos bucket's file size limit) and `src/lib/cloud/limits.ts`, which the app's messages are built from. Change both together, in a new migration.

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

Do this in the real project and again in the test project.

1. Open **Authentication > Sign In / Providers > Email**.
2. Keep **Confirm email** on. Shared designs only open for confirmed accounts.
3. Never enable auto-confirm (turning **Confirm email** off does that), and never turn off **Secure email change** (email-change confirmation). Either one would let someone sign up with, or switch to, an address they don't own and claim the designs waiting to be shared with it.
4. Open **Authentication > URL Configuration**.
5. Set **Site URL** to `http://localhost:3100` (change it to the Vercel URL once deployed, step 7).
6. Under **Redirect URLs**, add each of these:
   - `http://localhost:3100/auth/callback` (the app on your computer)
   - `http://localhost:3101/auth/callback` (the end-to-end tests; the test project only needs this one and the one above)
   - `https://<your-vercel-url>/auth/callback` (once deployed, step 7)

   Sign-up confirmation, password reset and Google sign-in all come back through `/auth/callback`. A link to any URL not on this list is refused.

## 5. Google sign-in (later)

The app launches with email and password only. The "Continue with Google" button stays hidden until `NEXT_PUBLIC_GOOGLE_AUTH=1` is set. To turn it on later:

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or pick) a project.
2. Open **APIs & Services > OAuth consent screen**. Fill in the app name, a support email and the app's URL, then publish it.
3. Open **APIs & Services > Credentials > Create credentials > OAuth client ID**, and choose **Web application**.
4. Under **Authorized redirect URIs**, add `https://<project-ref>.supabase.co/auth/v1/callback` (the real project's ref, as in its Project URL).
5. Create it, then copy the **Client ID** and **Client secret**. Keep the secret out of the repo.
6. In Supabase, open **Authentication > Sign In / Providers > Google**. Turn it on and paste the Client ID and Client secret. Save.
7. Check that `https://<your-vercel-url>/auth/callback` is in the redirect list (step 4).
8. Set `NEXT_PUBLIC_GOOGLE_AUTH=1` in `.env.local` and in Vercel's environment variables, then redeploy. The button appears on the sign-in page.

## 6. Custom email sender (optional)

Supabase's built-in mailer is rate-limited. For real use, add Resend (or any SMTP) under **Authentication > Emails > SMTP Settings**.

## 7. Deploy to Vercel

Next.js needs no `vercel.json`.

1. Make sure the real project has every migration (step 2): run `npm run db:push` after `npx supabase link`, or, without linking, `npx supabase db push --db-url "<session pooler connection string>"` (from the real project's **Connect > Session pooler**).
2. In [Vercel](https://vercel.com/new), import the GitHub repo. Keep the detected Next.js settings.
3. Before deploying, open **Environment Variables** and add the real project's values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   Only these two (plus `NEXT_PUBLIC_GOOGLE_AUTH=1` once Google is set up). The service key and database password never go to Vercel.
4. Deploy, and note the site's URL (for example `https://kalendario-studio.vercel.app`).
5. In the real Supabase project, open **Authentication > URL Configuration**:
   - Set **Site URL** to the Vercel URL.
   - Add `<vercel-url>/auth/callback` to **Redirect URLs** (keep the localhost ones).
6. Smoke test the live site from your computer:
   ```
   BASE_URL=<vercel-url> npm run e2e
   ```
   (In PowerShell: `$env:BASE_URL="<vercel-url>"; npm run e2e`.) This runs the editor tests against the deployed site. The cloud tests always use the test project on your computer.
7. Sign up on the live site with your own email, confirm it, and open **My designs** to check everything works end to end.

## 8. Approving sign-ups

New accounts can't use the cloud until you approve them. This protects the free plan's storage. After confirming their email, someone who signs in sees "Your account is waiting for approval" and stays signed out. The database also refuses anything they try to store.

- The accounts that existed when the approval migrations ran were approved automatically. `androidantoque@gmail.com` is the admin (or, if that account doesn't exist, the oldest account).
- As the admin, open the account menu and choose **Accounts** (it shows how many are waiting), or go to `/admin`. Every account is listed with its status, last sign-in, designs and photo space used.
  - **Activate** lets a waiting or deactivated account in.
  - **Deactivate** (click twice) turns an account off and signs it out everywhere. Its designs and photos stay, so activating it again brings them back.
  - **Decline** (click twice, waiting accounts only) deletes the account, and that email can sign up again.
- To make someone else an admin, run `update public.accounts set admin = true where email = '<their email>';` in the SQL Editor.

## 9. Keeping it running

- The free Supabase plan pauses a project after about a week with no activity. The site then can't sign in or sync (the local editor still works). Restore it from the dashboard with **Restore project**; nothing is lost. Any regular use keeps it awake.
- When a new file appears in `supabase/migrations`, push it to both projects (steps 2 and 3) before deploying the code that needs it.
- Signing out deletes the account's offline design copies from that browser. If some changes haven't synced yet, the app asks first.

## 10. Photo library

Photos belong to the account that uploaded them, not to one design (migration `20261025000001_photo_library`). Each design links to the photos it uses in `public.design_photos`. That link is what lets everyone the design is shared with see them.

- **Photos → More of your photos** lists the account's photos that the open design doesn't use. Adding one only links it, so it takes no extra space. Uploading a file the account already stored (same SHA-256, `photos.hash`) reuses the stored one.
- Removing a photo from a design only unlinks it. The space comes back when the photo is deleted from **More of your photos**. The database refuses that while any design still links the photo.
- Deleting a design keeps its photos in the library.
- A photo an editor uploads into someone else's design is in the editor's library and counts against the editor's space.
- Template photos stay in their template's folder. Applying a template copies each photo into the library once (hash `copy:<template path>`), so applying it again reuses those copies.
