# Cloud Designs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add accounts, My designs, email sharing and live co-editing on Supabase, so a design can be opened and edited from any computer, while the signed-out app keeps working as it does today.

**Architecture:**
- **One Yjs document per cloud design is the shared source of truth.** The zustand store keeps rendering a plain `CalendarDoc`:
  - Local mutations are diffed into the Y.Doc.
  - Remote Y updates are turned back into a `CalendarDoc` and applied without touching history.
- **Persistence is an append-only `design_updates` table** plus a compacted snapshot in `designs.state`. Concurrent writers never overwrite each other.
- **Realtime delivery:**
  - Other clients receive new update rows through Supabase Realtime `postgres_changes`, which respects RLS.
  - Presence uses the same private channel.
- **Offline:** y-indexeddb keeps an offline copy.
- **Photos:** stored in Supabase Storage and referenced as `sb:<path>`. They are fetched to `blob:` URLs so PNG export never sees a cross-origin image.

**Tech Stack:**
- Existing: Next.js 16 App Router, React 19, TypeScript, zustand and immer, vitest, Playwright.
- New: `@supabase/supabase-js` v2, `yjs`, `y-indexeddb`, and the `supabase` CLI as a dev dependency.

**Spec:** `docs/superpowers/specs/2026-10-19-cloud-designs-design.md`

## Global Constraints

- Supabase project `https://eavudkqpteddgefhpxck.supabase.co`.
- The app reads only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- The service_role key never appears in app code or committed files. The only exception is the **test** project's key, which lives in a git-ignored `.env.test.local` and is used by test setup only.
- Signed-out use of `/` behaves exactly as today. The existing `npm test` and `npm run e2e` suites must pass unchanged, with no Supabase needed.
- Per-account limits live in one SQL function, `app_limits()`, so the owner can change them:
  - 50 MB of photos (`52428800` bytes);
  - 50 designs;
  - 5 MB per photo file.
- Cloud photo uploads use at most 1600px and JPEG quality 0.82. Images with transparency stay PNG.
- A pending share links to an account only once `email_confirmed_at` is set. Share emails are stored lowercased.
- Roles: `owner`, `editor` ("Can edit") and `viewer` ("Can view"). Only the owner renames, deletes or changes sharing.
- Follow `FILE_STRUCTURE.md`: each component lives at `/Name/implementation/{Name.tsx, useNameHandler.ts, /handler}`, with one component function per `.tsx`.
- Match the existing UI copy style: plain, friendly sentences, using toasts through `toast()`.
- Excluded from sync: `doc.cur`, the current page, is per user.
- Not built in this plan:
  - service worker or PWA;
  - notification emails;
  - an admin page.

## Review Focus

1. **Dragging an element for 2 seconds.** This must not insert one database row per pointer move. Pushes are batched, at most one insert per 300 ms per client. Test in Task 4.
2. **Migrating a large local design that hits the 50 MB cap partway through.** No half-made design should be left in My designs. The user gets one clear message and the local copy is untouched. Test in Task 8.
3. **The session expires or the token refresh fails while editing.** Edits keep landing in y-indexeddb, a "Sign in again to keep syncing" banner shows, and after signing in the edits are pushed. Test in Task 4 (engine) and Task 5 (banner).
4. **The same design open in two tabs of the same browser.** Both tabs share the y-indexeddb database name. Both must keep working and converge. Test in Task 6 e2e.
5. **A collaborator receives an element whose photo hasn't finished uploading, or whose upload failed.** They see the existing empty-frame placeholder, not an error, and the photo appears once it's available. Test in Task 7.

---

## File Structure

```
supabase/
  config.toml                                  (supabase init)
  migrations/20261019000001_cloud.sql          tables, RLS, triggers, RPCs, realtime, storage bucket + policies
  tests/helpers.ts                             test-project clients: admin (service_role), makeUser(email)
  tests/rls.test.ts                            RLS + limits + linking + compaction
vitest.cloud.config.mts                        runs supabase/tests/**, loads .env.test.local
.env.example                                   documents NEXT_PUBLIC_SUPABASE_* (+ test vars)
docs/cloud-setup.md                            owner steps: keys, test project, CLI token, Google, SMTP, Vercel

src/lib/cloud/
  supabase.ts          supabase() singleton, cloudEnabled()
  ydoc.ts              CalendarDoc <-> Y.Doc mapping, diff, base64 helpers (pure)
  ydoc.test.ts
  sync.ts              DesignSync engine (transport-agnostic)
  sync.test.ts         two engines over an in-memory transport
  transport.ts         SupabaseTransport implements SyncTransport
  designs.ts           list/create/rename/remove/import/copy design rows
  members.ts           share/unshare/listMembers
  photos.ts            uploadPhoto, photoBlobUrl cache, usage, embedPhotos (for Save file)
  photos.test.ts       compression sizing (pure part)
  templates.ts         cloud My templates CRUD
src/store/
  useAuthStore.ts      user, ready, signIn/signUp/signOut/resetPassword/google
  useCloudStore.ts     current design session: id, role, status, others (presence), pending
  useStudioStore.ts    + readOnly, historyDriver, applyRemote
  usePhotoUrlStore.ts  sb: path -> blob URL cache with loading state
src/app/
  login/page.tsx  auth/callback/page.tsx  designs/page.tsx  d/[id]/page.tsx
src/components/
  Auth/implementation/{Auth.tsx,useAuthHandler.ts}
  Designs/implementation/{Designs.tsx,useDesignsHandler.ts, DesignCard/…}
  ShareDialog/implementation/{ShareDialog.tsx,useShareDialogHandler.ts}
  Studio/implementation/
    handler/useCloudSessionHandler.ts           replaces usePersistenceHandler in cloud mode
    AccountMenu/implementation/…                 TopBar: Sign in | avatar menu (My designs, usage, Sign out)
    Presence/implementation/…                    TopBar avatars
    Stage/implementation/OthersOverlay/…         collaborators' selection outlines
    CloudBanner/implementation/…                 migrate / sign-in-again / view-only / access-lost banners
```

---

### Task 1: Supabase wiring, schema, RLS, limits

**Files:**
- Create: `supabase/config.toml` (`npx supabase init`), `supabase/migrations/20261019000001_cloud.sql`, `supabase/tests/helpers.ts`, `supabase/tests/rls.test.ts`, `vitest.cloud.config.mts`, `.env.example`, `docs/cloud-setup.md`, `src/lib/cloud/supabase.ts`
- Modify: `package.json` (deps; scripts `"test:cloud": "vitest run -c vitest.cloud.config.mts"` and `"db:push": "supabase db push"`), `.gitignore` (add `.env*.local`, `supabase/.temp`)

**Interfaces:**
- Produces, in SQL:
  - Tables:
    - `designs(id uuid pk default gen_random_uuid(), owner uuid not null default auth.uid() references auth.users on delete cascade, name text not null default 'Untitled calendar', state text not null default '', compacted_through bigint not null default 0, thumb text, created_at, updated_at timestamptz default now())`
    - `design_updates(id bigserial pk, design_id uuid references designs on delete cascade, author uuid default auth.uid(), data text not null, created_at)`
    - `design_members(design_id uuid references designs on delete cascade, email text not null check (email = lower(email)), user_id uuid null references auth.users on delete set null, role text check (role in ('editor','viewer')), created_at, primary key(design_id, email))`
    - `photos(path text pk, owner uuid not null, design_id uuid null references designs on delete cascade, template_id uuid null references templates on delete cascade, bytes int not null check (bytes > 0), created_at)`
    - `templates(id uuid pk, owner uuid default auth.uid(), name text, saved_at timestamptz, data jsonb)`
  - Functions:
    - `app_limits()` returns `(photo_bytes bigint, designs int, file_bytes int)`;
    - `design_role(d uuid) returns text` ('owner'|'editor'|'viewer'|null), `security definer`, `stable`;
    - `load_design(d uuid) returns table(state text, through bigint, updates jsonb)`. It reads in one statement, and `updates` is `[{id, data}]` with `id > compacted_through`.
    - `compact_design(d uuid, new_state text, through bigint) returns boolean`. It updates only `where compacted_through < through`, then deletes updates `<= through`, and returns whether it applied.
    - `photo_usage() returns bigint`, the sum of `photos.bytes` for `owner = auth.uid()`.
  - Triggers:
    - Before insert on `designs`: reject when the owner already has `app_limits().designs` designs, with message `design limit reached`.
    - Before insert on `photos`: set `owner` to the design's owner (or `auth.uid()` for templates). Reject over `photo_bytes` with `photo storage limit reached`, or when `bytes > file_bytes`.
    - After insert, or after update of `email_confirmed_at`, on `auth.users`: when confirmed, run `update design_members set user_id = new.id where email = lower(new.email) and user_id is null`.
    - Before insert or update on `design_members`: set `user_id` from an existing **confirmed** user with that email.
  - RLS:
    - `designs`: select where `design_role(id) is not null`; insert where `owner = auth.uid()`; update `name/thumb/state` where the role is in (owner, editor), but `name` only for the owner (enforced by trigger); delete where owner.
    - `design_updates`: select where any role; insert where role in (owner, editor) and `author = auth.uid()`.
    - `design_members`: select where owner, or `user_id = auth.uid()`; insert, update and delete where the role is owner.
    - `templates`: owner only.
    - `photos`: select where `owner = auth.uid()` or `design_role(design_id) is not null`; insert where `design_role(design_id) in ('owner','editor')` or (`template_id` is set and the template is owned by the user).
  - Storage:
    - Private bucket `photos`, with `file_size_limit` 5 MB and allowed types `image/jpeg, image/png`.
    - `storage.objects` select and insert are allowed only when a matching `photos` row exists (`photos.path = name`) that the user can select or insert.
  - Realtime:
    - `alter publication supabase_realtime add table design_updates`.
    - `realtime.messages` policies: select and insert allowed when `realtime.topic() = 'design:' || id` for a design where `design_role(id) is not null`.
- Produces, in TS: `supabase(): SupabaseClient` (lazy singleton) and `cloudEnabled(): boolean`, which is true when both env vars are set. When it's false, every cloud UI entry point is hidden.

- [ ] **Step 1:** Install `@supabase/supabase-js yjs y-indexeddb` and dev dependency `supabase`. Run `npx supabase init`. Add the `.gitignore` entries and the scripts.
- [ ] **Step 2:** Write `docs/cloud-setup.md` with the owner's steps, numbered and plain:
  - (a) Copy the Project URL and anon key into `.env.local`.
  - (b) Create a personal access token, then run `npx supabase link --project-ref eavudkqpteddgefhpxck` and `npm run db:push`.
  - (c) Create a second free project "kalendario-test" and put its URL, anon key and service_role key in `.env.test.local` as `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY` and `TEST_SUPABASE_SERVICE_KEY`. Push the migration there too.
  - (d) Auth settings: keep "Confirm email" on; Site URL `http://localhost:3100`; redirect `http://localhost:3100/auth/callback`.
  - (e) Google OAuth (later).
  - (f) Optional custom SMTP through Resend.
  - (g) Vercel (Task 11).
- [ ] **Step 3: Write the failing RLS tests** in `supabase/tests/rls.test.ts`.
  - `helpers.ts` exposes:
    - `admin`, a service-role client;
    - `makeUser(email, { confirmed = true })`, which creates the user with `admin.auth.admin.createUser({ email, password, email_confirm: confirmed })`;
    - `as(user)`, a signed-in anon client.
  - Each test uses unique emails `t-<uuid>@example.test` and deletes its users in `afterEach`.
  - Tests:
    - `stranger cannot select, update or append to another user's design`: expect 0 rows, or an error.
    - `viewer can load_design but cannot insert design_updates`.
    - `editor can insert design_updates but cannot rename or delete`.
    - `owner can rename, share and delete; delete cascades members, updates, photos rows`.
    - `share to existing confirmed user links user_id immediately`.
    - `share to unknown email links when that email signs up and confirms, not before`: create the user unconfirmed, expect `user_id` null and select to return 0 rows; then `admin.auth.admin.updateUserById(id, { email_confirm: true })`, and the user can select the design.
    - `51st design is rejected with "design limit reached"`.
    - `photos row over 50 MB total is rejected with "photo storage limit reached"`, and `single photos row with bytes > 5242880 is rejected`.
    - `compact_design ignores a stale compaction`: insert updates 1–3, compact through 3 (true), then compact through 2 (false). State equals the through-3 state.
- [ ] **Step 4:** Run `npm run test:cloud`. Expect FAIL, because the tables don't exist.
- [ ] **Step 5:** Write the migration so it matches the Interfaces above, then push it to the **test** project.
- [ ] **Step 6:** Run `npm run test:cloud`. Expect all PASS. Also run `npm test && npm run typecheck`, which must PASS unchanged.
- [ ] **Step 7:** Commit with `git commit -m "Cloud: Supabase schema, RLS, limits and setup guide"`. Don't commit any `.env*.local` file.

### Task 2: Yjs document mapping

**Files:** Create `src/lib/cloud/ydoc.ts`, `src/lib/cloud/ydoc.test.ts`

**Interfaces:**
- Produces:
  - `type SharedDoc = Omit<CalendarDoc, 'cur'>`
  - `ROOT = 'doc'`, the key of the top `Y.Map`
  - `writeDoc(y: Y.Doc, doc: SharedDoc | CalendarDoc, origin?: unknown): void`. Fills an empty Y.Doc, ignoring `cur`.
  - `readDoc(y: Y.Doc): SharedDoc | null`. Returns null when it's empty.
  - `applyDiff(y: Y.Doc, prev: CalendarDoc, next: CalendarDoc, origin?: unknown): void`. Writes only what changed, in one `y.transact`.
  - `toB64(u: Uint8Array): string` and `fromB64(s: string): Uint8Array`.
- Mapping rules:
  - Plain objects become `Y.Map`.
  - Arrays of objects that have an `id` (`pages`, `els`) become `Y.Array` of `Y.Map`, diffed by id:
    - Removed ids are deleted.
    - New ids are inserted at their index.
    - An id whose position changed is deleted and re-inserted (a move).
    - Unchanged ids are recursed into.
  - Every other array (`tray`, `hiDays`) is stored as a plain JSON value and replaced when it isn't deep-equal.
  - Records (`assets`, `days`) become `Y.Map`.
  - Primitives are set when `!==`, and `undefined` deletes the key.
  - Subtrees where `prev === next` are skipped (immer structural sharing), so a drag diff is O(changed).

- [ ] **Step 1: Write failing tests:**
  - `round-trips freshDoc() except cur`: `readDoc(y)` deep-equals the doc without `cur`.
  - `applyDiff of a moved element only touches that element`: count transactions or events on the other elements, expecting 0.
  - `concurrent edits to different elements both survive`:
    - Two Y.Docs start from the same state.
    - A changes `els[0].x` while B changes `els[1].text`.
    - After exchanging updates, both read docs show both changes.
  - `concurrent edits to the same field converge to one value`: both docs end up equal.
  - `delete on one side and edit on the other converges` (element gone on both).
  - `reordering els (arrange front) keeps all elements`.
  - `cur changes produce no Y update`: an `update` listener isn't called.
  - `toB64/fromB64 round-trip`.
- [ ] **Step 2:** Run `npx vitest run src/lib/cloud/ydoc.test.ts`. Expect FAIL, because the module is missing.
- [ ] **Step 3:** Implement following the mapping rules.
- [ ] **Step 4:** Run the same command. Expect PASS.
- [ ] **Step 5:** Commit with `"Cloud: map calendar documents to Yjs"`.

### Task 3: Supabase transport

**Files:** Create `src/lib/cloud/transport.ts`

**Interfaces:**
- Produces:
  - ```ts
    interface SyncTransport {
      load(): Promise<{ state: string; through: number; updates: { id: number; data: string }[] }>;
      push(data: string): Promise<{ id: number }>;
      subscribe(onUpdate: (u: { id: number; data: string; author: string }) => void, onStatus: (s: 'live' | 'offline') => void): () => void;
      compact(state: string, through: number): Promise<boolean>;
    }
    ```
  - `class SupabaseTransport implements SyncTransport`, constructed with `(designId: string, userId: string)`. It uses:
    - `rpc('load_design')`;
    - `from('design_updates').insert({design_id, data}).select('id').single()`;
    - a private channel `design:<id>` with `postgres_changes` (INSERT on `design_updates`, filter `design_id=eq.<id>`). Rows where `author === userId` from this same tab are ignored by the engine, by update id, not here;
    - `rpc('compact_design')`.
  - Errors are thrown as `CloudError { code: 'denied' | 'offline' | 'auth' | 'limit' }`. They map from the Postgres error code or message: `42501` or RLS means denied; a network TypeError means offline; JWT expired means auth.
  - `channel(): RealtimeChannel` is exposed for presence (Task 10).
- [ ] **Step 1:** Implement it. It's covered by the e2e in Task 6 and by `rls.test.ts`. Add `transport maps RLS error to denied` to `supabase/tests/rls.test.ts`: a viewer push rejects with `code: 'denied'`.
- [ ] **Step 2:** Run `npm run test:cloud`. Expect PASS.
- [ ] **Step 3:** Commit with `"Cloud: Supabase sync transport"`.

### Task 4: Sync engine

**Files:** Create `src/lib/cloud/sync.ts`, `src/lib/cloud/sync.test.ts`

**Interfaces:**
- Consumes:
  - Task 2: `writeDoc/readDoc/applyDiff/toB64/fromB64`;
  - Task 3: `SyncTransport`, `CloudError`.
- Produces:
  - `class DesignSync`, constructed with `(designId: string, transport: SyncTransport, opts?: { persist?: (y: Y.Doc) => { whenSynced: Promise<unknown>; clearData(): Promise<void>; destroy(): void }, batchMs?: number /* 300 */, compactEvery?: number /* 200 updates */ })`.
    - `ydoc: Y.Doc`
    - `start(): Promise<SharedDoc | null>`:
      1. Wait for local persistence, which is y-indexeddb in the app and none in tests.
      2. `load()`, then apply `state` and the updates.
      3. Push `Y.encodeStateAsUpdate(ydoc, serverStateVector)` if it isn't empty. This uploads offline edits.
      4. Subscribe.
    - `local(prev: CalendarDoc, next: CalendarDoc, tracked: boolean): void` calls `applyDiff`. The origin is `LOCAL` when tracked and `LOCAL_UNTRACKED` otherwise (the latter is not undoable).
    - `on(ev: 'remote', cb: (doc: SharedDoc) => void)`, `on(ev: 'status', cb: (s: SyncStatus) => void)`
    - `type SyncStatus = { state: 'connecting' | 'live' | 'offline' | 'auth' | 'denied'; pending: boolean }`
    - `flush(): Promise<void>`, `stop(): Promise<void>`, `clearLocal(): Promise<void>`
  - Origins: `export const LOCAL`, `LOCAL_UNTRACKED` and `REMOTE` (symbols) are used as Y transaction origins.
    - Every Y update whose origin isn't `REMOTE` is queued for pushing. That includes the UndoManager's own transactions from Task 10.
    - Every transaction whose origin is neither `LOCAL` nor `LOCAL_UNTRACKED` (so remote applies and undo/redo) emits `remote` with `readDoc(ydoc)`.
  - Batching:
    - Local Y updates are collected and sent as one `Y.mergeUpdates` at most every `batchMs`.
    - A failed push keeps the batch and retries with backoff of 1, 2, 4… up to 30 s. A `denied` failure stops retrying and sets status `denied`.
    - Remote updates whose id this engine pushed are skipped.
  - Compaction: after `compactEvery` updates seen since load, call `compact(toB64(encodeStateAsUpdate), maxSeenId)`. Fire and forget.
- [ ] **Step 1: Write failing tests**, using an `InMemoryTransport` in the test file that holds `{state, through, updates[]}` and fans out pushes to subscribers:
  - `two engines converge on concurrent edits to different elements`.
  - `edits made while transport is offline are pushed on next start`: engine A with `persist` set to a shared in-memory store, transport throwing `offline`, makes an edit and stops. A new engine using the same persist is started with the transport back online, and the server ends up with the edit.
  - `a 2-second drag (120 local diffs, 16ms apart, fake timers) produces at most 8 pushes`.
  - `auth error keeps the batch and status becomes "auth"; after transport recovers, the batch is pushed`.
  - `denied stops retrying and status becomes "denied"`.
  - `compaction race: two engines compacting concurrently lose nothing`: after both compact, a fresh engine `start()` reads all edits.
  - `own pushed updates are not re-applied as remote`: the remote callback isn't called for its own push.
- [ ] **Step 2:** Run `npx vitest run src/lib/cloud/sync.test.ts`. Expect FAIL.
- [ ] **Step 3:** Implement `DesignSync`.
- [ ] **Step 4:** Run the same command. Expect PASS.
- [ ] **Step 5:** Commit with `"Cloud: design sync engine with batching, offline replay, compaction"`.

### Task 5: Accounts (sign up, sign in, account menu)

**Files:**
- Create:
  - `src/store/useAuthStore.ts`
  - `src/app/login/page.tsx`
  - `src/app/auth/callback/page.tsx`
  - `src/components/Auth/implementation/{Auth.tsx,useAuthHandler.ts}`
  - `src/components/Studio/implementation/AccountMenu/implementation/{AccountMenu.tsx,useAccountMenuHandler.ts}`
  - `e2e/cloud/helpers.ts`
  - `e2e/cloud/auth.spec.ts`
- Modify:
  - `src/components/Studio/implementation/TopBar/implementation/TopBar.tsx` (render `<AccountMenu />`)
  - `playwright.config.ts`: add a `cloud` project with `testMatch: /cloud\/.*\.spec/`. It's ignored by the existing projects and skipped unless `TEST_SUPABASE_URL` is set. Its `webServer` runs with `NEXT_PUBLIC_SUPABASE_*` taken from the test vars.

**Interfaces:**
- Produces:
  - `useAuthStore`: `{ user: { id: string; email: string; name: string } | null; ready: boolean; init(): void; signUp(email, password, name): Promise<'check-email'>; signIn(email, password): Promise<void>; google(): Promise<void>; resetPassword(email): Promise<void>; signOut(): Promise<void> }`.
    - `init` subscribes to `onAuthStateChange`.
    - `name` comes from `user_metadata.name`, falling back to the part of the email before `@`.
    - `signOut` is guarded later, in Task 11.
  - Visibility rules:
    - The "Sign in with Google" button shows only when `process.env.NEXT_PUBLIC_GOOGLE_AUTH === '1'`.
    - `AccountMenu` renders nothing when `!cloudEnabled()`.
  - `e2e/cloud/helpers.ts`:
    - `newUser(): Promise<{email, password}>`, a confirmed user created through the test admin client;
    - `signIn(page, user)`;
    - `newDesign(page): Promise<string>` (design id; used from Task 6).
- [ ] **Step 1: Write failing e2e** in `e2e/cloud/auth.spec.ts`:
  - `sign up shows "Check your email" and does not sign in`.
  - `confirmed user signs in and sees their email in the account menu`.
  - `wrong password shows "That email and password don't match."`.
  - `signed-out top bar shows "Sign in" and the editor still works`.
- [ ] **Step 2:** Run `npx playwright test --project=cloud e2e/cloud/auth.spec.ts`. Expect FAIL.
- [ ] **Step 3:** Implement:
  - The store.
  - The `/login` page with tabs for Sign in, Create account and Forgot password, styled with the existing tokens in `globals.css`.
  - `/auth/callback`, which calls `exchangeCodeForSession` and then routes to `/designs`.
  - The account menu: `Sign in` when signed out; when signed in, the initial avatar with **My designs**, the email, and **Sign out**.
- [ ] **Step 4:** Run the cloud e2e (PASS) and `npm run e2e` (existing suite PASS unchanged).
- [ ] **Step 5:** Commit with `"Accounts: sign up, sign in, account menu"`.

### Task 6: My designs and the cloud editor

**Files:**
- Create:
  - `src/lib/cloud/designs.ts`
  - `src/store/useCloudStore.ts`
  - `src/app/designs/page.tsx`
  - `src/app/d/[id]/page.tsx`
  - `src/components/Designs/implementation/{Designs.tsx,useDesignsHandler.ts,DesignCard/implementation/{DesignCard.tsx,useDesignCardHandler.ts}}`
  - `src/components/Studio/implementation/handler/useCloudSessionHandler.ts`
  - `e2e/cloud/designs.spec.ts`
- Modify:
  - `src/components/Studio/implementation/Studio.tsx`: takes the prop `designId?: string`.
  - `useStudioHandler.ts`: `designId ? useCloudSessionHandler(designId) : usePersistenceHandler()`.
  - `src/store/useStudioStore.ts`

**Interfaces:**
- Consumes: Task 4 `DesignSync`, Task 3 `SupabaseTransport`, and Task 2 `writeDoc/toB64`.
- Produces:
  - `designs.ts`:
    - `listMine(): Promise<DesignRow[]>`, `listShared(): Promise<DesignRow[]>`
    - `type DesignRow = { id; name; owner; role: 'owner'|'editor'|'viewer'; thumb: string|null; updated_at }`
    - `createDesign(doc: CalendarDoc, name?: string): Promise<string>`. It writes the initial `state` as `toB64(encodeStateAsUpdate)` of a Y.Doc filled with `writeDoc`.
    - `renameDesign(id, name)`, `removeDesign(id)` (removes its storage objects first, then the row), `saveThumb(id, dataUrl)`.
  - `useStudioStore` additions:
    - `applyRemote(doc: SharedDoc): void`. Replaces the doc while keeping the local `cur` (clamped). It records no history and drops `sel` or `multi` ids that no longer exist.
    - `readOnly: boolean`. `mutate` returns early, with `toast('This design is view only.')` at most once per 3 s, when it's true.
    - `historyDriver: { undo(): void; redo(): void; stop(): void } | null`. When set, `mutate` and `checkpoint` skip `past`/`future`, and `undo`/`redo` delegate to it. Task 10 sets it.
    - `onLocalChange: ((prev: CalendarDoc, next: CalendarDoc, tracked: boolean) => void) | null`. Called from `mutate` after every applied recipe, with `tracked = history !== false`. Undo and redo in local-history mode call it with `tracked: true`.
  - `useCloudStore`:
    - `{ designId: string|null; role; name; status: SyncStatus; others: Presence[]; setName(n) }`
    - `type Presence = { key: string; name: string; color: string; page: number; sel: string[] }` (presence is filled in Task 10).
  - `useCloudSessionHandler(designId)`:
    1. Waits for auth and redirects to `/login?next=/d/<id>` when signed out.
    2. Gets the role from `designs` and sets `readOnly` when the role is viewer.
    3. Starts `DesignSync` with `SupabaseTransport` and `IndexeddbPersistence('kal-design-' + id, ydoc)`, then calls `hydrate(start() result merged with cur: 0)`.
    4. Wires `onLocalChange` to `sync.local` and `sync.on('remote')` to `applyRemote`.
    5. Reflects status into `useCloudStore`.
    6. Saves a thumbnail of page 0 on unmount and every 60 s when changed: `html-to-image` `toJpeg`, width 320, quality 0.7, from the rendered first page.
  - Designs page:
    - A grid of `DesignCard` (thumbnail, name, "Edited <relative time>", a role badge for shared ones).
    - Tabs **My designs** and **Shared with me**.
    - A **New design** button, which calls `createDesign(freshDoc())` and routes to `/d/<id>`.
    - Owners get rename, and delete through the existing `ConfirmButton`.
    - Reaching the 50-design cap shows `You've reached 50 designs. Delete one to make room.`
  - TopBar in cloud mode: an editable design name (owner only), a sync indicator (`Saved` / `Saving…` / `Offline, changes kept on this computer` / `Sign in again to keep syncing`), and a "My designs" back link.
- [ ] **Step 1: Write failing e2e** in `e2e/cloud/designs.spec.ts`:
  - `new design opens in the editor and appears in My designs after going back`.
  - `edit on one computer shows on another`: two browser contexts, same user. Context A adds a heading. Context B opens `/d/<id>` and sees it, then sees A's next text change without reloading, within 5 s.
  - `two tabs in the same context both stay in sync` (Review Focus 4).
  - `rename and delete from My designs`.
  - `signed-out visit to /d/<id> goes to /login and back after sign in`.
  - `stranger opening someone else's /d/<id> sees "You don't have access to this design."`.
  - `going offline shows the offline indicator; edits made offline appear on the other context after reconnect`: use `context.setOffline(true/false)`.
- [ ] **Step 2:** Run `npx playwright test --project=cloud e2e/cloud/designs.spec.ts`. Expect FAIL.
- [ ] **Step 3:** Implement the store additions first, then run `npm test && npm run e2e`. The existing behavior must be unchanged.
- [ ] **Step 4:** Implement `designs.ts`, `useCloudStore`, `useCloudSessionHandler`, the pages and the TopBar additions.
- [ ] **Step 5:** Run the cloud e2e and the existing suites. Expect PASS.
- [ ] **Step 6:** Commit with `"My designs: cloud-saved designs that open on any computer"`.

### Task 7: Photos in Supabase Storage

**Files:**
- Create: `src/lib/cloud/photos.ts`, `src/lib/cloud/photos.test.ts`, `src/store/usePhotoUrlStore.ts`, `e2e/cloud/photos.spec.ts`
- Modify:
  - `src/lib/calendar/samplePhoto.ts`: `readImage(file, max = 2000, quality = 0.9)`, with the defaults unchanged.
  - `src/store/actions.ts` `addFiles`: in cloud mode, upload each file and store `{ src: 'sb:<path>', w, h }`.
  - Every place that puts `asset.src` into the DOM. Those are `useImageElementHandler.ts`, `useCalendarElementHandler.ts:130`, `usePhotosPanelHandler.ts`, and `ImageSection*`; grep `\.src\b` in `src/components` to confirm. They now go through `usePhotoUrl(src)`.
  - `AccountMenu`: shows usage, `12.3 MB of 50 MB used`.

**Interfaces:**
- Produces:
  - `uploadPhoto(designId: string, file: File): Promise<Asset>`:
    1. Calls `readImage(file, 1600, 0.82)` and converts it to a Blob.
    2. Uses the path `<designId>/<uid>.jpg|png`.
    3. Inserts the `photos` row (`bytes = blob.size`).
    4. Uploads to the `photos` bucket.
    5. If the upload fails, deletes the row.
    6. Throws `CloudError{code:'limit'}` for the limit messages, which surface as the toast `Your 50 MB photo space is full. Remove photos from your designs to add more.`
    7. Offline, it throws `offline`, which surfaces as the toast `You're offline. Photos can be added once you're back online.`
  - `photoUsage(): Promise<number>` (bytes).
  - `usePhotoUrl(src: string): string | null`. Data, `blob:` and `@sample` sources pass through unchanged. `sb:` sources resolve through `usePhotoUrlStore` (`storage.download`, then `URL.createObjectURL`) and are cached per path.
    - While loading or after a failure it returns null, and callers render their existing empty-frame look.
    - It retries a failed fetch on the next request after 10 s.
  - `embedPhotos(doc: CalendarDoc): Promise<CalendarDoc>`. Returns a copy with every `sb:` asset turned into a data URL. Used by Save file and by Task 8.
  - `photosOf(doc: CalendarDoc): string[]` lists the `sb:` paths.
- [ ] **Step 1: Write failing unit tests** in `photos.test.ts` for the pure helpers: `photosOf lists sb: paths only` and `isCloudSrc`.
- [ ] **Step 2: Write failing e2e:**
  - `photo uploaded on A appears on B`.
  - `export PNG of a page with a cloud photo succeeds`: the download event fires and the PNG is larger than 10 KB.
  - `element referencing a not-yet-available photo shows the empty frame and fills in once uploaded`: delay the B-side storage download route with `page.route`, assert the placeholder, then release and assert the `<img>` (Review Focus 5).
  - `usage shows in the account menu after upload`.
- [ ] **Step 3:** Run both the unit and e2e tests. Expect FAIL.
- [ ] **Step 4:** Implement, then grep that no component renders `asset.src` directly.
- [ ] **Step 5:** Run `npm test`, `npm run e2e` and the cloud e2e. Expect PASS.
- [ ] **Step 6:** Commit with `"Cloud photos: upload once, show everywhere, 50 MB per account"`.

### Task 8: Bring local work into the cloud (migration, design files, My templates)

**Files:**
- Create:
  - `src/lib/cloud/templates.ts`
  - `src/lib/cloud/importDoc.ts`
  - `src/components/Studio/implementation/CloudBanner/implementation/{CloudBanner.tsx,useCloudBannerHandler.ts}`
  - `e2e/cloud/migrate.spec.ts`
- Modify:
  - `src/store/actions.ts` (`saveDesignFile`, `openDesignFile`)
  - `src/store/useMyTemplatesStore.ts` (cloud backend when signed in)
  - `Studio.tsx` (render `<CloudBanner />`)

**Interfaces:**
- Produces:
  - `importDoc(doc: CalendarDoc, name: string, onProgress?: (done: number, total: number) => void): Promise<string>`:
    1. Checks `photoUsage()` plus the estimated bytes of the data-URL assets against 50 MB **before** creating anything. If over, it throws `limit` without side effects.
    2. Creates the design.
    3. Uploads each data-URL asset through `uploadPhoto` and rewrites the srcs.
    4. Writes the state.
    5. On any failure after creation, calls `removeDesign(newId)` and rethrows.
  - **Banner on `/`:** shown when signed in, when the local doc isn't the untouched `freshDoc()`, and when the flag `kal-migrated-<userId>` isn't set. It reads: "Keep this calendar on every computer?" with **Save to My designs** and **Not now** (the latter dismisses it for the session).
    - Saving shows progress (`Uploading photos 3 of 12…`), then opens `/d/<id>`.
    - It never clears the local design.
  - **Cloud templates** (`templates.ts`): `listTemplates`, `saveTemplate(t: MyTemplate)` (photos uploaded with `template_id`), `removeTemplate(id)`, and `applyCloudTemplate(designId, t)`, which copies template photos into the design folder with `storage.copy` and inserts `photos` rows.
  - **First sign-in:** local IndexedDB templates are uploaded once. The flag `kal-tpl-migrated-<userId>` records it, and the local copies are kept.
  - **`saveDesignFile` in cloud mode** serializes `await embedPhotos(doc)`, so the file is a full offline backup.
  - **`openDesignFile` while signed in** (on `/` or `/d/…`) calls `importDoc(parsed, fileBaseName)` and routes to it. Signed out, it behaves as today.
- [ ] **Step 1: Write failing e2e:**
  - `local design with a photo migrates and opens in the cloud editor; local copy still on /`.
  - `migration over the photo cap leaves no new design and shows the limit message` (Review Focus 2): seed photos rows for the test user near 50 MB through the admin client.
  - `Save file from a cloud design re-opens signed out with photos visible`.
  - `Open file while signed in creates a new design in My designs`.
  - `saved template appears on a second context and applies with its photo`.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the cloud e2e and the existing suites. Expect PASS. The existing `designfile.spec.ts` and `mytemplates.spec.ts` must be unchanged and passing.
- [ ] **Step 5:** Commit with `"Cloud: save local work, design files and templates to your account"`.

### Task 9: Sharing by email and view-only access

**Files:**
- Create:
  - `src/lib/cloud/members.ts`
  - `src/components/ShareDialog/implementation/{ShareDialog.tsx,useShareDialogHandler.ts}`
  - `e2e/cloud/share.spec.ts`
- Modify: TopBar (a **Share** button for the owner; a **View only** badge and **Save a copy** button for viewers), `CloudBanner` (access-lost state), `useCloudSessionHandler` (on `denied`)

**Interfaces:**
- Produces:
  - `members.ts`:
    - `listMembers(designId): Promise<{ email; role; joined: boolean }[]>`, where `joined` means `user_id` is not null.
    - `share(designId, email, role)`. Lowercases and trims the email, upserts, and rejects the owner's own email with `That's you.`
    - `setRole(designId, email, role)`, `unshare(designId, email)`
    - `copyDesign(designId): Promise<string>`, which does `importDoc(await embedPhotos(currentDoc), name + ' (copy)')`.
  - ShareDialog uses the existing `Modal`:
    - An email input, a role select (`Can edit` / `Can view`) and **Share**.
    - A member list with a role select and **Remove**.
    - A not-yet-joined member shows `Invited — appears for them once they sign up with this email`.
  - Viewer mode (`readOnly`):
    - No selection handles and no inspector editing (add a `.readonly` class on `.app`; hide `SelectionOverlay`; disable inspector inputs and drawer add actions).
    - Export, print, Save file and **Save a copy** stay available.
  - When access is lost (`status.state === 'denied'` during a session):
    - The banner reads `You no longer have access to this design.`, with **Save as a copy in My designs** (built from the local Y.Doc state) and **Close**.
    - The editor becomes read-only.
- [ ] **Step 1: Write failing e2e:**
  - `owner shares by email (Can edit); invitee sees it under Shared with me and edits appear live for the owner`.
  - `Can view user sees View only, cannot move an element, can export PNG and Save a copy`.
  - `sharing to an email without an account shows Invited; after that email signs up and is confirmed it appears for them`: create the user unconfirmed through admin, then confirm.
  - `removing access while the invitee has it open shows the access-lost banner and Save as a copy works`.
  - `only owner sees Share and rename`.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it. Expect PASS. The existing suites must also pass.
- [ ] **Step 5:** Commit with `"Share designs by email with Can edit / Can view"`.

### Task 10: Live collaboration (presence, per-person undo, whole-design confirm)

**Files:**
- Create:
  - `src/components/Studio/implementation/Presence/implementation/{Presence.tsx,usePresenceHandler.ts}`
  - `src/components/Studio/implementation/Stage/implementation/OthersOverlay/implementation/{OthersOverlay.tsx,useOthersOverlayHandler.ts}`
  - `src/lib/cloud/undo.ts`
  - `e2e/cloud/live.spec.ts`
- Modify:
  - `useCloudSessionHandler` (presence tracking, undo driver)
  - `src/store/actions.ts`: `applyTemplate`, `fillYear`, `applyDesignToAll`, the year change, and `useMyTemplatesStore.apply`. Each calls `await confirmReplaceAll()` first.

**Interfaces:**
- Consumes: Task 3's `SupabaseTransport.channel()`, Task 4's `DesignSync.ydoc` and its `LOCAL` origin, and Task 6's `historyDriver` and `useCloudStore.others`.
- Produces:
  - Presence:
    - The channel calls `track({ name, color, page: doc.cur, sel: selIds(state) })`. It runs on selection and page changes, throttled to 150 ms.
    - The color is picked deterministically from the user id, from a palette of 6 distinct token colors.
    - `others` excludes this tab's own presence key.
    - Presence shows avatars (an initial in a coloured circle, with the name in the title) for other people, de-duplicated by user.
    - `OthersOverlay` draws a 2px outline in that person's color with a name tag around their selected elements, only when they're on the same page.
  - `makeUndoDriver(ydoc: Y.Doc, onApplied: () => void): { undo(); redo(); stop(); destroy() }`:
    - It wraps `new Y.UndoManager(ydoc.getMap(ROOT), { trackedOrigins: new Set([LOCAL]), captureTimeout: 1200 })`.
    - The engine applies an undo by emitting a `remote`-style doc refresh into the store. Undo changes the Y.Doc directly, so it must also be pushed. The engine's `ydoc.on('update')` already pushes any non-remote origin.
    - `checkpoint()` and a `mutate` key change call `stop()`, which runs `stopCapturing`.
    - "Nothing to undo." still toasts when the stack is empty.
  - `confirmReplaceAll(): Promise<boolean>`:
    - It resolves true immediately when `others` is empty.
    - Otherwise it opens a `Modal` reading `<Name> is also editing. This replaces all pages.`, with buttons **Replace anyway** and **Cancel**.
- [ ] **Step 1: Write failing tests:**
  - Unit test in `ydoc.test.ts`, `undo manager only reverts local changes`. Docs A and B are synced. A moves el0, B edits el1, and A undoes. el0 is back and el1 keeps B's edit.
  - E2e in `live.spec.ts`:
    - `the other person's avatar appears and their selected element gets a coloured outline`.
    - `undo on A doesn't revert B's change`.
    - `Fill year while someone else is in the design asks for confirmation; Cancel leaves pages unchanged`.
    - `simultaneous edits to different elements from A and B both persist after reload`.
- [ ] **Step 2:** Run them. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run them. Expect PASS. Run the full existing suites; local undo is unchanged.
- [ ] **Step 5:** Commit with `"Live editing: see who's here, per-person undo, confirm whole-design changes"`.

### Task 11: Sign-out safety, Google sign-in, deploy

**Files:**
- Modify: `useAuthStore.signOut`, `AccountMenu`, `docs/cloud-setup.md`, `e2e/cloud/auth.spec.ts`
- Create: `vercel.json`, only if it's needed (Next.js needs none by default).

**Interfaces:**
- Produces:
  - `signOut({ force?: boolean })`:
    - If `useCloudStore.status.pending` and not `force`, it shows the Modal `Some changes haven't synced yet.` with **Wait** (resolves after `flush()`, then signs out) and **Sign out anyway**.
    - After signing out, it deletes the IndexedDB databases whose names start with `kal-design-`, through `indexedDB.databases()` with a fallback to the ids tracked in `localStorage` key `kal-design-dbs`.
    - It clears `usePhotoUrlStore` (revoking object URLs) and routes to `/`.
  - Google sign-in is **deferred**; the owner chose email and password for launch. The button stays hidden behind `NEXT_PUBLIC_GOOGLE_AUTH`. The `docs/cloud-setup.md` steps for turning it on later cover: Google Cloud OAuth client, the Supabase provider settings, the redirect `https://<project>.supabase.co/auth/v1/callback`, and setting `NEXT_PUBLIC_GOOGLE_AUTH=1`.
  - Deploy docs cover:
    - Import the repo into Vercel and set the two env vars.
    - Add the Vercel URL to the Supabase Site URL and to redirect URLs (`<vercel-url>/auth/callback`).
    - Run `BASE_URL=<vercel-url> npm run e2e` as a smoke test.
- [ ] **Step 1: Write failing e2e:**
  - `sign out with unsynced changes asks first; Sign out anyway clears local design cache`: go offline, edit, sign out. Afterwards `indexedDB.databases()` has no `kal-design-` entries.
  - `sign out when synced goes straight to /`.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Implement it and finish the docs.
- [ ] **Step 4: Full verification.** Run `npm run typecheck && npm test && npm run test:cloud && npm run e2e && npx playwright test --project=cloud`. Everything must PASS.
- [ ] **Step 5:** Commit with `"Sign-out safety, Google sign-in setup and deploy guide"`.
- [ ] **Step 6:** The owner deploys by following `docs/cloud-setup.md` (g). Run the `BASE_URL` smoke test against the deployed URL.
