# Cloud designs: logins, My designs, sharing and live editing

Date: 2026-10-19
Status: awaiting owner approval

## Why

Today every design lives only inside one browser (IndexedDB, key `kalendaryo-studio-v3`). Moving
between the owner's laptop and desktop means downloading a `.kalendaryo` file and opening it on
the other machine. When the owner's wife helps edit, the file has to go to her and back. If
someone forgets to send the latest file, the other person can't pick up where they left off.

The goal, in the owner's words: "I just want to access my project on any computer." They also
want to work together on a design the way Canva works.

## Goals

1. **Logins.** Each person has their own account: email and password, plus "Sign in with Google".
2. **My designs.** Each account has a list of its designs, stored online. Any design opens on any
   computer exactly as it was last left, with no download or upload.
3. **Sharing by email, like Canva.** The owner of a design types someone's email and picks
   **Can edit** or **Can view**.
   - If the person has an account, the design appears under **Shared with me** in their list.
   - If they don't have one yet, it appears there as soon as they sign up with that email.
   - The owner sees who has access and can remove anyone. Only the owner can delete the design,
     rename it, or change sharing.
4. **Live editing.** When two people have the same design open, each sees the other's changes
   appear live. Each also sees where the other is working: a coloured outline on the element the
   other person has selected, plus their name or initial.
5. **Never lose work** (the owner agreed this is the main thing that would make them wince).
   - Two people editing different elements at the same time must both keep their changes.
   - Two people changing the *same* property of the *same* element at once: last write wins.
     That's acceptable.
   - If the connection drops, edits keep being saved on that computer and sync up when it comes
     back. Closing the tab while offline must not lose them.
6. **Photos sync.** A photo added on one computer shows up everywhere the design is opened. Each
   photo is uploaded once, not re-sent with every save.
7. **My templates follow the account.** Saved "My templates" are stored online per account, so they
   show up on every computer.

## Non-goals (for now)

- No notification emails when something is shared. The design just appears in the list.
- No comments, chat, version history browsing, or teams/workspaces.
- No public "anyone with the link" sharing.
- No payments or plan limits.

## Anti-goals

- Losing or silently overwriting someone's edits (see goal 5).
- Anyone seeing a design that isn't theirs or wasn't shared with them. This is enforced in the
  database (Supabase row-level security), not just hidden in the UI.

## Decided

- **Backend: Supabase.** The owner has already created the project at
  `https://eavudkqpteddgefhpxck.supabase.co`. Use Supabase Auth, Postgres, Storage, and Realtime.
  - The app only ever uses the public anon key.
  - The service_role key never goes in the app or the repo.
- **Hosting: Vercel.** The owner will sign up when the app is ready to go online.
- **Each person has their own account.** Collaboration happens through sharing, not a shared
  login.

- **Public sign-up, like Canva.** Anyone can create an account. The owner wants this partly so
  usage can be tracked: who signed up, and how many designs there are.
  - For now, tracking means the Supabase dashboard (Auth users list, table rows).
  - A dedicated admin or analytics page is a non-goal for this project.
  - Because sign-up is open, the builder adds **per-account limits**, enforced in the database:
    a photo storage cap (**50 MB per account**, agreed with the owner), a maximum photo size, and a design count
    cap (suggested 50). These protect the free plan quotas: 1 GB storage and 500 MB database.
  - The limit values live in one place so the owner can change them.
  - Show each signed-in user how much of their photo storage they've used, for example in the
    account menu or Photos panel.
  - Cloud uploads may compress photos a bit harder than today's 2000px at JPEG 0.9, for example
    around 1600px at about 0.82, as long as print quality holds up. The aim is to fit more
    calendars into the 1 GB.
  - **Start on the free plan.** Growing past it would need Supabase Pro (about $25/month). That's
    the owner's decision later, when storage fills up.
  - Free projects pause after about a week with no activity. This is acceptable, and the owner
    wakes the project from the dashboard if needed.

## Builder's calls (made by Claude; flagged for the owner to check)

1. **Logging in stays optional (confirmed by the owner).** People who aren't logged in use the
   app exactly as today, at no cost to the owner. The app keeps working without an account exactly as today, with
   the single local design, design files, and local templates.
   - Logging in adds My designs, sharing and sync.
   - This keeps the current e2e tests valid and leaves the app usable by anyone who opens it.
2. **First login migrates local work.**
   - If the browser has a local design, offer a one-time "Save this design to My designs" button.
   - Also upload local My templates to the account.
   - Never delete the local copy automatically.
3. **Live sync engine: Yjs is recommended**, with a Y.Doc per design as the source of truth while
   it's open.
   - Sync updates between open tabs over Supabase Realtime broadcast, on a channel per design.
   - Persist the merged Yjs state to Postgres, with debounced snapshots and optionally an append
     log that is compacted.
   - Keep an offline copy in IndexedDB (y-indexeddb) so goal 5 holds.
   - The zustand store keeps rendering from a plain `CalendarDoc`, mirrored from and into the
     Y.Doc.
   - The builder may choose a different mechanism if it meets goals 4 and 5. Immer-patch broadcast
     with per-element last-writer-wins is one option. Whole-doc overwrite saves are **not**
     acceptable, because they lose concurrent edits.
4. **Undo is per person.** Your undo reverses only your own changes, using a Yjs UndoManager
   scoped to local edits or an equivalent. This replaces the current 80-full-copy `past`/`future`
   history for cloud designs. Local-only mode can keep the current history.
5. **Photos move to Supabase Storage.**
   - In cloud designs, `Asset.src` becomes a reference to a storage object instead of a base64
     data URL.
   - Uploads still go through `readImage`, so they're scaled to at most 2000px.
   - The private bucket is readable by the design's owner and its collaborators.
   - PNG export (`html-to-image`) and print must still work. Images need to be same-origin or
     CORS-readable (signed URLs or fetched to blobs) so the export canvas isn't tainted.
6. **Design files keep working.** **Save file** still downloads a `.kalendaryo` with photos embedded
   as data URLs, so it's a full offline backup. **Open file** while signed in creates a new design
   in My designs.
7. **Viewers can't edit.** For **Can view** users the editor is read-only: no selection handles, no
   inspector edits, and the database rejects their writes. They can still export, print, and save a
   copy to their own designs.
8. **What "same account email" means for sharing.**
   - A share is stored against a lowercased email.
   - When a user signs up or logs in with that email, matching pending shares link to their
     account automatically, through a database trigger or an equivalent RLS rule on email.
9. **Google sign-in setup.** This needs a Google Cloud OAuth client added in the Supabase
   dashboard. The builder writes step-by-step instructions for the owner.
   - Ship email and password first.
   - Google can follow once the owner has made the client.
10. **New screens.**
    - Sign-in and sign-up page.
    - My designs page: grid of thumbnails with name and last edited, a New design button, and two
      tabs, **My designs** and **Shared with me**.
    - Share dialog.
    - Account menu with sign out.
    - Presence avatars in the top bar.
    - The editor route becomes per design, for example `/d/[id]`.

11. **Email confirmation is required.**
    - A pending share links to an account only once that account's email is confirmed
      (`email_confirmed_at` is set). Otherwise anyone could sign up as someone else's email and
      read their shared designs.
    - Start with Supabase's built-in email sender. It's rate-limited to a few messages an hour,
      which is fine for a household.
    - A custom sender (for example Resend) is a later, optional owner step, documented like the
      Google one.
12. **What "offline" covers.**
    - It covers a tab that is already open losing its connection, and unsynced edits surviving a
      tab close. They replay from IndexedDB the next time the design opens online.
    - Opening or reloading the app with no internet is **not** in scope: no service worker or PWA.
      This fits the owner's stated aim of reaching the project from any computer.
    - Adding photos while offline is blocked, with a clear message.
13. **Signing out and losing access.**
    - Signing out with unsynced edits warns first: "Some changes haven't synced yet. Wait or sign
      out anyway." Signing out then clears that account's local caches, because this could be a
      borrowed computer.
    - If access is removed, or the design is deleted, while someone has offline edits, those edits
      can't sync. That person is offered "Save as a copy in My designs" (or "Save file" if signed
      out), and otherwise the edits are dropped.
14. **Whole-document actions while others are present.** These include applying a template, Fill
    year, Apply design to all, and changing the year.
    - When someone else has the design open, ask for confirmation first: "<name> is also editing.
      This replaces all pages."
    - Otherwise these actions behave as today. They are not rewritten as per-element edits.
15. **Database changes and tests.**
    - Schema and RLS policies live as SQL migration files in the repo (`supabase/migrations`) and
      are applied with the Supabase CLI. The owner provides a personal access token, or pastes the
      SQL into the dashboard.
    - Docker isn't installed, so automated tests that need a backend run against a **second, free
      "test" Supabase project** that the owner creates, never the real one.
    - RLS gets its own tests: a stranger can't read or write, a viewer can't write, and an editor
      can.

## Left to the builder

- Exact table layout. A likely shape is `designs`, `design_members (design_id, email, user_id,
  role)`, `templates`, and a Yjs state/updates table, with RLS policies.
- How the zustand store is split between per-user UI state (selection, tab, current page) and
  shared document state. For example, `doc.cur`, the current page, should become per-user, not
  synced.
- Thumbnail generation for the list.
- Visual design of the new screens. Match the existing look in `globals.css`.
- Test strategy. Keep the existing Playwright suite passing in signed-out mode, and add e2e
  coverage for two browser contexts editing the same design.

## Constraints

- The stack stays as it is: Next.js 16 App Router, React 19, zustand and immer, TypeScript. Follow
  `FILE_STRUCTURE.md` (component/implementation/handler layout).
- Documents can be tens of MB today because photos are embedded. After the move to Storage, the
  synced document should be small: elements and text only.
- The free Supabase and Vercel plans must be enough for a handful of users.
