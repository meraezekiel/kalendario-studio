# Kalendaryo Studio — Next.js port plan

Source: `kalendaryo-studio.html` (single-file vanilla JS editor). Goal: same features, rebuilt as a
maintainable Next.js app that follows `FILE_STRUCTURE.md`, verified in a real browser with Playwright.

## Stack
| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | requested; client-only editor page |
| State | Zustand + Immer | mutation-style updates like the original, cheap structural-sharing undo/redo |
| Persistence | IndexedDB via `idb-keyval` | photos are data URLs; localStorage's ~5 MB cap was the original's pain point |
| PNG export | `html-to-image` | maintained replacement for html2canvas |
| Styling | Plain global CSS ported from the original (tokens, dark mode) | proven look, no translation risk |
| Tests | Vitest (pure calendar logic) + Playwright (end-to-end in Chromium) | "always verify in the browser" |

## Layout
```
src/
  app/                layout.tsx, page.tsx, globals.css
  lib/calendar/       pure logic: constants, types, factories, templates, holidays, tokens, geometry, samplePhoto
  store/              useStudioStore.ts (doc, selection, history, persistence)
  components/         every component = /Name/implementation/{Name.tsx, useNameHandler.ts, /handler, /Nested}
    Studio/           app shell, keyboard shortcuts, paste, persistence boot
      TopBar/ ToolRail/ Drawer/(TemplatesPanel, AddPanel, PhotosPanel, PagesPanel)
      Stage/(PageCanvas, SelectionOverlay, PageBar; handler/ pointer, drop, double-click)
      Inspector/(PageSection, DaySection, TextSection, ImageSection, ShapeSection, CalendarSection,
                 EventsSection, ArrangeSection, LayersSection)
      PrintArea/ Toast/
    PageView/         pure renderer of a page (used by stage, thumbnails, print, PNG)
      TextElement/ ImageElement/ ShapeElement/ CalendarElement/ EventsElement/
    Fields/           shared inspector inputs (number, range, color, text, select, seg, check, font)
e2e/                  Playwright specs
```

## Feature checklist (parity with the original)
- Templates: pastel, classic, modern, split, giveaway 3-month, giveaway 12-month, blank
- Elements: text (tokens {MONTH}/{YEAR}/{MONTH+1}…), photo frames, 13 shapes, month table, holiday list
- Select, move (snap guides), resize (8 handles, aspect lock), rotate, arrow-key nudge, lock/hide, layers
- Double-click: edit text / edit day number / open photo picker / reposition photo in frame
- Per-day: custom number, label, colour, picture, hide holiday
- Photos tray: upload, drag-and-drop, tap-to-arm placement, paste from clipboard
- Pages: paper sizes, orientation, month, background, add/dup/delete/reorder, fill year, apply design to all
- Philippine holidays (fixed + Easter-based + National Heroes Day)
- Undo/redo, copy/paste/duplicate, autosave, print (one / all), PNG export, responsive + dark mode

## Verification
1. `vitest` for holidays, tokens, dims, makeYear/sync.
2. `next build` must pass type-check and lint.
3. Playwright e2e against `next start`: load, templates, add/edit/move/resize, day editing, photo upload,
   undo/redo, pages, persistence across reload, PNG download, mobile viewport; screenshots reviewed.
