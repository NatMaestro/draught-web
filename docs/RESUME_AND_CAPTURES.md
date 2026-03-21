# Resume game & captured pieces (client)

## Captured pieces

- The Django `GET /games/:id/` payload does **not** include cumulative “pieces taken” counts.
- Tallies are stored in React state during play and **persisted** in `localStorage` with the resume snapshot so they survive refresh and navigation.
- Move responses normalize `captured` squares; JSON arrays `[row, col]` are supported as well as `{ row, col }`.

## Resume (single slot)

- **Storage key:** `draught:resume:v1` — one active “resume” record per browser profile.
- **Saved:** `gameId`, `status`, `isAiGame`, `p1CapturedPieces`, `p2CapturedPieces`, optional PNG **thumbnail** (canvas of the board), `updatedAt`.
- **While** `status === active` and no winner, `useGamePlay` debounces (~450ms) and updates this record after moves.
- **Cleared** when the game ends (`winner`, `finished`, `abandoned`) or when loading a finished game from the server.

### Edge cases

| Scenario | Behaviour |
|----------|-----------|
| Start a **new** game (new `gameId`) | Next save from the new `GamePlayPage` **overwrites** the previous resume slot. Only the latest in-progress game is remembered. |
| Two tabs | Last write to `localStorage` wins (same as most “last session” UX). |
| Resume tap but server game already finished | Page loads; `hydrateFromGame` clears resume if `status !== active`. |
| Private mode / quota | `try/catch` around `localStorage`; resume may be unavailable. |
| Another device | Not synced — server board is still correct; captures/thumbnail are local only. |

### Future improvements

- Optional **list** of recent games (multiple slots) with explicit “abandon”.
- Server-side **material** or **move history** to rebuild captures without `localStorage`.
