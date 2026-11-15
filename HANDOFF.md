# Living room backdrop: design and handoff

A mod for the Claude Code desktop app: a time-aware living room drawn behind
the chat, where an orange mascot and a kitten react to what the session does.

## State (2026-11-15, seventeenth round)

The mod is now this repository, github.com/SegFault03/lofi-theme (public; the
local folder is still called `claude-lofi-theme`). The plugin and the
marketplace are both named `lofi-theme`, so its id is `lofi-theme@lofi-theme`
(a third party's plugin name may not start with `claude-`; the validator
refuses it). Earlier rounds call it `living-room`, which is
still the backdrop's scene id. Work here; the copies in the per-session
dev-mods folders are gone.

**Status TV, air conditioner, date: version 0.4.0 (2026-11-15, seventeenth round; not committed)**

The user saw 0.3.1 in the app (1907x960): it animates, the project and the
chat's name both show, the text reads. This round, on their list. Where a
number here differs from the 0.3.1 notes below, this one holds.

- TV higher, `TV.y` 106: about 10 units under the top of the user's window,
  like a status board. It cannot be pinned to the viewport's top (the crop
  depends on the window's shape and the SVG has no way to know it), so a
  16:9 window shows more wall above it and a wider one crops into it.
- The desk has its own `DESK_DROP` (92); the shelf group is at
  `translate(40,116)` and the clock at `CLOCK_AT` 1474,433. The chair, the
  mascot's desk spot (x 1350), the keyboard and the desk lamp moved right.
- Figures on the TV are coloured by `heat(p)`: green to 50, yellow above,
  red above 80. Both rings, their two lines, the centre number, `CTX` and
  its bar. The tracks are grey.
- Greeting: `Screen.greeting` (shape `tv-2`), from `greeting(hour, name)`
  in `logic.js`, set by `screenOf` while the project or the chat's name is
  missing. It takes the project's line, or the chat's line when only that
  is missing. The name is the login name, `$.env.get('USERNAME')` then
  `'USER'`, read once in `air` (`F.user`). No option for another name yet.
- Date under the clock (`SUN 15 NOV`): `time.day`, from `dateLabel`. Plain
  text, so the minute tick bumps `resync` when the day turns. The clock's
  case is taller (72).
- Floor, to keep clear of the plant (canvas x up to 110): `walk` is 165 px
  from x 156; yarn at x 168; play at 168 with the pounce at 228; the bed at
  `BED_X` 300.
- Air conditioner over the window (`AC`, `airCase` under the wash,
  `airFlow` over it): runs for every pose but work, facepalm, cheer and
  notice. One new keyframe, `cool` (opacity and translateY, as `steam`).
- Ticker: each item once. A line of 44 characters or fewer stands still
  (no animation); a longer one slides (`tick`, now 232 to -600 px in 30 s).
  `screenOf` adds a warning for each of five hours, week and context that
  is above 80.
- Usage figures: still pushed by `session.measure` (after each main turn,
  and when a window moves a whole point). The user saw them lag, so the
  minute tick now also calls `gauge` then `air`. Both read what the last
  response of this session reported: use by other sessions shows only
  after the next reply here, and nothing in the engine gives it sooner.
- Chat's name after a reload: it was lost twice over. The shape bump to
  `tv-2` dropped the stored screen (once), and `classic.SessionStart` set
  `hasHeardTitle` even when it brought no title, so `air` would not take
  the name back from the stored screen. Now it is set only with a title or
  a /clear. The user confirmed the name returns with the next prompt.
- The line "lofi-theme: no attached desktop or mobile client" under the
  prompt came from `dress`: at a reload `$.theme.set` answers
  `isDrawn: false` though the theme stands (it has a `requestId`) and is
  drawn when the client attaches. `dress` now shows a status only when
  there is no `requestId`, and clears it otherwise.
- Audit for leaks (2026-11-15), nothing found that grows:
  timers are one `clock.every` (now kept in `S.tick` and cancelled before
  it is set again), `S.showTimer` and `S.noticeTimer` (each cancelled or
  run out), and one `clock.after` per tool call, cancelled in `finally`. A
  hot reload cancels them all (engine's rule). `S` and `F` are fixed in
  size; `buildScene` keeps nothing. The standing cost is the drawing: 62
  animated elements of 343 on a plain day, up to 186 of 791 with rain and
  fireworks at night, redrawn whole on each state write. The minute tick
  makes about four engine calls. Left running by an earlier session: a
  preview server on port 4173 (which is why later ones land on 4174/4175).
- 0.4.1, the TV's names: the chat's name is the large top line and the
  project's the small one under it, with a folder icon. No LIVE mark. The
  greeting takes the top line while there is no chat name. `fit` no longer
  cuts the names: `nameLine` lets one that fits stand still, and pans a
  longer one (up to 80 characters) to its end and back under its own clip
  path, by a keyframe written for its length (`pana`, `panb`; translate
  only) that `buildScene` adds to the style block. Seen in the preview with
  48-character names; not seen in the app, where a keyframe made per name
  is new.
- 0.4.2, the branch: a third line under the project's, with a branch mark
  (`Screen.branch`, pan keyframe `panc`). No model on the TV any more
  (`Screen.model` and the `$.session.model()` call are gone), so the names
  start higher. `scout` in `register.tsx` runs
  `git branch --show-current` through `$.process.run` (3 s limit): no
  repository, a detached head or no git gives no line. It is read at the
  start, with each prompt, after any shell tool call whose command names
  git, and on the minute tick (for a checkout made outside the session,
  seen within a minute). The shape tag stayed `tv-2`: an optional field
  more, and a bump would drop the stored chat name at the reload.
- No polling (the user's call, 2026-11-15): the minute tick no longer
  reads usage or the branch. Usage comes only by `session.measure` (and
  `gauge` at the start, /clear and compaction); the branch at the start,
  with each prompt and after a shell command that names git. The tick
  still asks for the project's name while it is missing, and no longer
  once it is there. This replaces what the notes above and below say of
  a once-a-minute read.
- 0.5.0, beside the branch: what is not committed (`+1.2k -32`,
  `Screen.diff`) and a mark for the branch's pull request (`Screen.pr`, a
  `PrState`). `scout` adds `git diff --shortstat HEAD` (tracked files,
  staged or not; new untracked files are not counted). `survey` runs
  `gh pr view --json state,isDraft,reviewDecision,statusCheckRollup`
  (10 s limit); `prState` in `logic.js` makes one word of it, the worst
  news first: failing, changes, pending, draft, passing, open; merged and
  closed. `survey` goes over the network, so it is started and not
  awaited, and airs the screen itself. If `gh` cannot start (or times
  out) it is not tried again until a reload (`hasGh`). Read at the start,
  with each prompt, at the end of each main turn, and after a shell
  command that names git or gh. Nothing is polled, so a check that
  finishes on GitHub shows at the next of those. `prMark` in `scene.js`
  draws the eight marks; `&diff=133,32&pr=failing` in the preview.
  Checked: validate, 25 tests, `tsc`; the marks `failing` and `merged` in
  the preview. Not checked: a real pull request, and the app.
  The user saw the branch and the diff update in the app on a throwaway
  branch; that branch is deleted and the tree is back on `main`.
- 0.5.1: the TV is 16 taller (`TV.h` 164, bottom at canvas y 344) and the
  pull request has a line of its own under the branch: `prCard`, a rounded
  label as GitHub draws one (Open green, Draft grey, Merged purple, Closed
  red) and, for an open one with news, the disc from `prMark` with
  "checks running / failing / passed" or "changes requested". With no
  request the line stays empty; the lines under it do not move up. The
  diff reads `+132/-64`. Seen in the preview (failing, merged, none); not
  in the app. Still nothing committed: the user wants to see the diff
  figure on `main` first.

- 0.5.2: the diff figure stands right after the branch name (it was at
  the right end), the branch line is larger (9.5, the figure 8.5) and sits
  further under the project line; the quota lines moved down 2.

- CI (2026-11-15): `.github/workflows/ci.yml` installs the current
  `@anthropic-ai/claude-code` from npm and runs validate and test, the two
  checks that need nothing but the engine (both ran here with an empty
  config folder, so no sign-in). Not pinned, by choice: a kit change like
  the one in `$.ui.mount` will fail CI, which is the news wanted. `tsc` is
  left out: its types are written by the engine on load and are not in git.
- All of the above was committed on the branch `tv-status-board` and a
  pull request opened from it; the TV's card can now be checked against it.

**Next step for a new session:** the user checks 0.5.2 in the app after
`/reload-plugins`, then the pull request card against a real pull request
(open one from a branch; `gh` is installed). Commit only when asked, on a
branch, not on `main`. An old preview server from an earlier session may
still hold port 4173.

- The failing test was the kit: `$.ui.mount` now resolves with a handle
  where it used to refuse. The test asks `keepsBeneath()` instead.

Checked: validate passes (two standing warnings), `claude plugin test .`
22 pass, `tsc -p .` clean. Preview at 1907x960: dusk/phone/prowl with a
full TV (62, 91, 85), night/work/yarn with the empty TV and the greeting.

Not checked in the app: the new keyframe `cool` and the still ticker
(either could matter to animation), the login name, the date at midnight.
Open: the desk top (y 652) now sits below the skirting line (640); it reads
as nearer the viewer, like the couch, but the user has not said.

**New layout, version 0.3.1 (2026-11-15, sixteenth round; not committed)**

The user saw 0.3.0 in the app (1902x956): the TV was too small to read, and
the room wasted the floor. That window crops the top 96 canvas units
(`xMidYMax slice`), so the room now keeps low. This replaces the positions
given in the 0.3.0 notes below.

- `DROP = 60` in `scene.js` lowers the couch, lamp, desk, chair and every
  floor and furniture spot of the cast. `SILL` (from `WIN`) places the cast
  at the window.
- TV: right wall over the desk, `TV = { x: 1232, y: 150, s: 1.45 }` (canvas
  x 1232..1580, y 150..365). It is still drawn 240 x 148 and scaled, which
  is what makes the text bigger (8 becomes 11.6). With no TV the poster
  hangs there. `tvFace` now goes in the right group, over the wash.
- Shelf (wider, y to 444) under the TV; the clock stands on it
  (`CLOCK_AT` 1474,403); one row of notes under it.
- Desk: one monitor (`PC`), moved right; the second is gone. A desk lamp at
  the left end of the desk (`deskLamp`; the mascot sits between it and the monitor), lit while the mascot is at the desk, with a
  glow in the dark phases.
- Left: window lower (`WIN.y` 266), floor lamp shorter (`LAMP_CUT`), the
  kitten's bed at `BED_X` 190, the plant at the left edge (x 58).
- Names on the TV: the project was blank in a new session in the app (cause
  not found; the chat's name did arrive with the second prompt). `air` now
  asks again whenever the project is missing (`$.session.repo().root`, then
  `$.session.cwd()`, then what the screen already shows), and the minute
  tick calls `air` while either name is missing. The chat's name has no
  call to ask: it comes only with `session_title` on the classic events.

Checked: `claude plugin validate .` passes (same two warnings);
`tsc -p .` clean; `claude plugin test .` 18 pass, 1 fail: "the mod leaves
the chat rows as the app draws them" (`$.ui.mount` now resolves where the
test expects a refusal). The committed code also has one failing test, so
this looks like a change in the engine, not this round; not looked into.
Preview at 1902x956: night/work/desk and day/window/sleep with the TV, day
without. At 1280x800 the crop takes about 89 units a side, so the TV's
right fifth (the model's name, line ends) is cut.

Not checked in the app: that the room still animates, that the project's
name now appears, and the size of the text.

**Wall TV, version 0.3.0 (2026-11-15, fifteenth round; not committed)**

A TV, first on the left wall between the window and the couch (moved in
0.3.1, above). It shows two quota rings (week outside, five
hours inside), the project and chat name, the model, a context bar and a
ticker (turn count, cost, when the session began). Option `tv`, on by
default.

How it is built:

- `scene.js`: `tvCase()` under the wash, `tvFace(tv)` over it, drawn only
  when `look.tv` (a `Screen`, in `types/index.d.ts`) is given. The rings
  are static dashes. One new keyframe, `tick` (translate only), moves the
  ticker under a clip path. Names are escaped and cut to fit.
- `logic.js`: `screenOf(facts)` rounds the session's facts into a `Screen`
  (whole percents, tokens to the thousand, cost to the cent), so the scene is
  redrawn only when a figure visibly moves. `resetLabel`, `folderName`.
- `register.tsx`: a third state key, `lofi-theme.tv` (shape `tv-1`). The
  facts sit in the module object `F`. `tune` fills them at `session.start`
  (`$.session.repo()`'s name, else the folder's; `$.session.usage()`);
  `session.measure` brings the quota windows, the context and the cost after
  each turn and when a window moves a whole point; `air` writes the screen
  when it differs. The chat's name comes only from `session_title` on
  `classic.SessionStart` and `classic.UserPromptSubmit`, so a rename or the
  first auto-title reaches the TV at the next prompt. `classic.SessionStart`
  also re-reads the figures (`gauge`), since `session.start` does not fire
  on /clear; it drops the chat's name on a /clear and keeps it on a
  compaction.
- `tools/preview.mjs`: `&tv=1` (with `p5`, `pw`, `ctx`, `chat`,
  `project`) or `&tv=empty`. `.claude/launch.json` starts the preview in
  the app's browser pane.

Decided: the TV has its own state key rather than fields on `Room`, so
`/room` pins and the pose logic are untouched. A measurement lands just after
the turn's own pose write, so a turn's end can redraw the scene twice. No
live reset countdown (it would need the clock's CSS trick) and no branch name
(not in `SessionRepo`; it would need git through `$.process`).

**Checked** (2026-11-15): `claude plugin validate .` passes with its two
standing warnings (no icon; CLAUDE.md at the root is not loaded as context);
`claude plugin test .` 19 pass; `tsc -p .` clean (TypeScript 5.9.3 through
npx). Preview in Chromium: day, dusk and night with the phone, scroll, nap,
sleep and window poses, full and empty screens. At 1600x900 and 1280x800 the
whole TV shows; at 1100x800 the crop takes its left third (the rings), as it
takes the window and couch.

**Not checked: the desktop app.** Ask the user:

1. Is the room still moving with the TV on? If it is frozen, `tick` (a
   moving `<text>` under a clip path) is the suspect: turn the `tv` option
   off to confirm.
2. Do the rings and the context bar show real figures after the first reply?
   Nothing has confirmed that the app raises `session.measure` or fills
   `rateLimits`.
3. Does the chat's name appear after the second prompt? Whether the app
   fills `session_title` is not known. If it never does, drop the line or
   find another source.
4. Can the text be read? It is about 8 px at a 1600 px window. If not, the
   wall has little room: the sill ends at y 316 and a waiting thought bubble
   tops out near y 474, so growing it means moving the window or the couch.

**Done in the fourteenth round**

- **Digital clock** in place of the analog one, hours and minutes, 24-hour by
  default. It keeps time by CSS, with no redraw each minute: `clockColumns`
  in `scene.js` stacks every glyph of a column in one spot and lights each
  for its slot of a long `steps(1)` opacity animation, placed by a negative
  delay. Only features the scene already used (`steps(1)`, negative delays,
  opacity keyframes). The case is drawn under the wash and the digits over
  it, so they glow at night like the screens.
- **Options** (`userConfig` in `plugin.json`, read once in `readOptions`):
  `clockFormat`, `timeOfDay`, `wall`, `kitten`, `celebrations`, `rain`.
  `buildScene` takes them as a third argument, `look`.
- **Resync**: a `resync` state key the Backdrop hook reads. The minute tick
  bumps it when a tick arrives more than 90 s after the last one (the machine
  slept), so the scene is drawn again with the right time.
- **Packaging**: `marketplace.json` (source `./`), README, CLAUDE.md,
  `.gitignore`, `tools/preview.mjs`, version 0.2.0.

**Checked** (2026-11-15): `claude plugin validate .` passes apart from the
plugin directory's note about the missing icon; `claude plugin test .`
14 pass; `tsc -p .` clean (TypeScript 5.9.3, with the engine's types copied
in from an older load). In Chromium via the preview, with the animations'
clocks pushed forward by script: 23:59:40 becomes 00:00, 00:01, 00:10, 01:00,
12:00 and 00:00 again. All four walls looked at by day and by night.

**Not checked: the desktop app itself.** Nobody has seen this round in the
app. Ask the user:

1. Does the clock show the right time, and does the minute change by itself?
2. Is everything else still moving? One bad animation has stilled a whole
   scene before; if the room is frozen, the clock's rules are the suspect.
3. After the app has been minimised or hidden for a few minutes, is the clock
   behind? The resync only knows about machine sleep. There is no focus or
   visibility event in the types to hook. If it lags, bump `resync` from the
   minute tick every so often (each bump restarts the animations).

**Also not checked: any install.** `marketplace.json` validates, but the
plugin has not been installed from this folder or from GitHub. From the
folder: `claude plugin marketplace add <this folder>`, then
`claude plugin install lofi-theme@lofi-theme`. The owner asked for the
steps and means to run them; whether they have is not known.

The old `living-room` copies in the per-session dev-mods folders, and the
old plugin's store file (a stale `motion` key), were moved to the Recycle Bin
on 2026-11-15 at the owner's request. This repository is the only copy.

Git: one branch, `main`, pushed to `origin` (the first commit, 2026-11-15).
Commits are authored as `SegFault03`, the owner's GitHub account. `author`,
the marketplace `owner` and the README's install lines all say `SegFault03`.

**Open**

1. (Done: MIT, chosen by the owner. `LICENSE` and `license` in `plugin.json`.)
2. An icon (`.claude-plugin/icon.png`, square, 512 px or more).
3. The install from GitHub has not been tried:
   `claude plugin install lofi-theme --marketplace SegFault03/lofi-theme`.
4. Narrow windows: below about 1800 px wide the furniture goes behind the
   chat. Media rules are out. `e.viewport` on the render event gives columns
   and rows in character cells; a hook could shift the sides from that,
   untried.
5. Whether the tenth round's layout and wall colour look right in the app was
   asked twice and never answered.

**The rule that took twelve rounds to find**: in the desktop app's backdrop
frame (`Svg` with `isInteractive`), a CSS `filter` or an `@media` rule
anywhere in the document stills every animation in it. A mask and a clip path
are fine. CLAUDE.md lists this with the other rules; a test holds it.

Everything below that mentions frame modes, `/room motion`, scans, probes,
`FIT`, cards, the veil, the bookshelf, the rug, `/room debug` or the analog
clock's hands is history: none of it is in the code now.

## What the user asked for

- Lighting follows the real clock (morning, afternoon, night).
- A panoramic living room a software engineer might have: PC, windows, etc.
- The orange mascot, posed by activity: phone or window in the morning, perks
  up when the user types, works at the PC during a turn, naps or sleeps when
  idle, celebrates a finished feature, fireworks outside on a merged PR.
- Added later: a kitten with its own poses, and the mascot lazing off
  (doomscrolling, napping, something else) while waiting on a background
  process or on the user's input.

## Approaches considered

1. **One SVG rebuilt per state (chosen).** A pure function turns a small state
   object into the whole scene. Only the current poses are in the document, so
   it stays near 64k of the 131,072-character cap. Cost: every state change
   swaps the document, which restarts its CSS animations.
2. All poses in one SVG, toggled by class. Smooth swaps, but the size cap is
   too tight for 10 mascot poses, 8 kitten poses, 5 phases and effects.
3. A still image plus a pane for the mascot. Rejected: not a backdrop, and
   nothing would animate behind the chat.

## How it works

| File | Job |
| --- | --- |
| `hooks/scene.js` | `buildScene(room, time, look)`: the SVG string. Pure, seeded randomness. |
| `hooks/logic.js` | Pure decisions: phase by hour, rest pose, kitten pose, shell-command classification, rainy days. |
| `hooks/register.tsx` | Event wiring. Session facts in module object `S`, options in `O`; what is drawn in `$.state` (`lofi-theme.room`, shape `room-1`, and `lofi-theme.resync`). |
| `types/index.d.ts` | The `Room` state contract. |
| `hooks/register.test.tsx` | Size cap over every combination, logic, and two end-to-end flows. |

Event mapping:

- `session.start`: sets the backdrop, registers `/room`, starts a one-minute
  tick (phase, pose rotation, clock resync).
- `prompt.change`: mascot `notice` for 7s after the last key (not in a turn).
- `turn.start` / `turn.complete` (main loop only, `agentId` absent): `work`,
  then a rest pose.
- `tool.call`: `AskUserQuestion` or any call over 20s puts the mascot in a
  lazing pose with an hourglass bubble. Shell commands (`Bash`, `PowerShell`):
  `gh pr merge` gives fireworks for 25s, `git commit` confetti for 9s, a
  passing test a short cheer, a failing test a facepalm.
  `run_in_background` keeps the hourglass up after the turn ends.
- `/room <words>` poses and pins the room (`/room night fireworks`,
  `/room nap kitten-yarn`); `/room auto` unpins. `/room` alone lists the words.

## Second round (2026-11-15), after the user's first look

The user saw the room in the app (dark mode, pinned to `day work`): the scene
draws, sharp at the edges and blurred behind the chat column. They asked for
Claude's replies as rounded cards so only the cards are translucent, and
whether pose changes animate.

- **Reply cards**: a `ui.render` hook on `AssistantMessage` wraps the reply in
  a `Box` with `borderStyle="round"` and an rgba fill. Unverified in the app:
  whether desktop honors the rounded border and the rgba alpha.
- **Glass** is now `{ blur: 0, opacity: 0.2 }`; `/room veil <0-100>` changes
  the opacity for the session (not persisted).
- (Superseded in round three: color mode override and rgba cards.)
- Cards read a separate `scheme` state key, so a pose change does not redraw
  every message.
- **Pose changes** were hard cuts; the cast now fades in (`enter`, 0.45s).
  In-pose loops (breathing, typing, tail, clouds) were always there.
- Not done: the top bar. The user drafted, then removed, a request to make it
  transparent with time-based text colors; no API for it was looked up.

## Third round (2026-11-15), after the second look

User feedback: cards should be solid, small rows (notices, hints) need cards
too, and **no animation was ever visible in the app** (a still image).

- **Still image, cause not confirmed.** Two suspects, both fixed blind:
  animations were set in inline `style` attributes (the app's sandboxed frame
  may drop them; the skill's guide says to animate from the `<style>` block),
  and a `prefers-reduced-motion` rule switched everything off. `hoist()` in
  `scene.js` now moves every inline style into a class in the stylesheet, and
  the reduced-motion rule is gone. A test asserts no `style="` remains.
  If the scene is still frozen, next suspects: the frame not running CSS
  animation at all (try SMIL `<animate>`), or `isInteractive` not honored.
- **Color mode override removed.** The types say the desktop app ignores
  `overrideColorScheme`, so the "mode follows the room" idea from round two
  is gone, with the `scheme` state key.
- **Cards are solid and follow the person's mode** via theme keys:
  `backgroundColor="inverseText"`, `borderColor="subtle"`. Unverified how the
  desktop app paints those keys.
- **Small cards** wrap `InfoNotice`, `CommandOutput`, `TurnDuration`,
  `ToolUse`, `Spinner`, `PromptHint` (`SMALL_ROWS`). `ToolGroup` and
  `ToolResult` are left alone to avoid cards inside cards. The app's own
  next-step box is not a hookable component.
- `session.start` no longer dies if `theme.set` is refused. In the test host
  it is refused ("id is 1 to 64 of letters...", cause unknown, probably the
  test's mock); in the app the backdrop draws.

## Fourth round (2026-11-15): diagnosing, not fixing

User's third look (dark mode): reply cards draw solid and rounded. Still
wrong: (1) a black bar at the very top, (2) small rows have no cards (the
"mod reloaded" notice was the visible example), (3) the scene is still frozen.

Established facts:

- Windows "Animation effects" is ON (checked via SystemParametersInfo), so
  reduced motion is not the cause.
- The scene animates in a plain Chromium tab (33 animations, 32 running), so
  the SVG is fine; the app's frame is what stops it.
- The scene's `<style>` block does apply in the app (the poster text shows the
  stylesheet's monospace bold), so only the animation part is lost.

Diagnostics now in the build, both TEMPORARY:

- `motionTest()` in `scene.js`: a dark panel top-left with two dots, one moved
  by CSS keyframes, one by SMIL. Ask the user which bounces. If only SMIL:
  port the animations to SMIL. If neither: the app draws a still, and motion
  needs redraws from a timer (frame swaps) or is not possible.
- A matcher-less `ui.render` hook counts rows per surface; `/room debug`
  prints them. Use it to learn which of `SMALL_ROWS` the desktop app raises.

Black bar: believed to be the app's own scroll-edge fade at the top of the
transcript, drawn in the app's dark page color and now visible because the
veil dropped to 20%. Not confirmed with the user; no hook for it is known.
`/room veil 50` should blend it.

## Fifth round (2026-11-15): what the desktop app actually does

Facts from the user's app:

- **Neither motion-test dot moved**: with `isInteractive`, the desktop app
  draws the backdrop Svg as a still. CSS keyframes and SMIL are both frozen.
- `/room debug` output. The desktop app raises `ui.render` only for:
  `AbovePrompt`, `AssistantMessage`, `Backdrop`, `SessionMode`, `Spinner`,
  `ToolGroup`, `UserMessage`. It never raised `InfoNotice`, `CommandOutput`,
  `ToolUse`, `TurnDuration` or `PromptHint`, so those rows (the "mod reloaded"
  notice, command output, the next-step box) cannot be carded by a mod.

Changes this round:

- `SMALL_ROWS` is now `ToolGroup` and `Spinner` only.
- **Experiment in flight**: the Svg is drawn WITHOUT `isInteractive` (image
  mode) to see whether an image animates where the frame did not. The motion
  test panel is still in. Result not yet known.

If image mode is frozen too, the remaining route is a `Client` surface
module (`ClientProps` in the types: `module: './x.tsx'`, runs on the surface
with its own state, timers and clock, kept across redraws). It could drive
frames locally with no host round trip. Not yet read in depth: which elements
a surface module may draw on desktop, its clock API, and whether swapping a
60k Svg per frame is smooth. A cheaper design would keep the room as one
still Svg and animate only small pieces (mascot, kitten) as separate layers.
Start a fresh session for that work: read "surface module" in the types and
`reference.md` first.

When animation works, remove `motionTest()` from `scene.js` and the
matcher-less counting hook plus `/room debug` from `register.tsx`.

## Sixth round (2026-11-15): animation is blocked in both Svg modes

Image mode (no `isInteractive`) is frozen too: neither motion-test dot moved.
**Conclusion: the desktop app draws a backdrop `Svg` as a still, whatever the
mode. CSS keyframes and SMIL never play.** Everything else works: the room,
lighting by clock, poses by session events, `/room`, reply cards.

The motion-test panel is no longer drawn (`motionTest()` is still in
`scene.js`, uncalled, for the next attempt). The Svg stays in image mode.

### Next step: make it move (start here in a new session)

Two routes, neither tried:

1. **Timer-swapped frames from the hooks module.** Add a frame counter to
   what the render hook reads, tick it with `$.clock.every` (try 500 to
   1000 ms), and have `scene.js` draw each pose as a function of the frame
   (bob offset, alternating arms, tail left/right, Zzz position, blink) in
   place of CSS animation. A two-to-four-frame loop, sprite style. Cheap to
   try, reuses everything. Unknowns: whether swapping a 60k document flickers
   (ask the user whether pose changes via `/room` flash), and the cost of a
   host round trip per frame. Only tick while the window matters; stop the
   ticker when the mascot sleeps or the session is idle for long.
2. **A `Client` surface module** (`ClientProps` in the types): code that runs
   on the surface with its own state, timers and clock, kept across redraws.
   It could animate locally with no host round trip. Unread so far: which
   elements it may draw on desktop, its clock API, whether it may sit in a
   `Backdrop` tree (the Backdrop doc says "a `Client` draws nothing on
   mobile", which implies desktop draws one).

Try route 1 first with a one-element spike (move only the mascot's bob) and
have the user confirm it moves and does not flicker before porting the rest.

(A note here about per-session dev-mods folders no longer applies: the mod
lives in this repository.)

## Seventh round (2026-11-15): route 1 spike in flight

Spike, awaiting the user's look: a `frame` state key (`frame-1`) ticked every
650 ms by `$.clock.every` in `session.start`; the `Backdrop` hook reads it
(desktop only, mobile gets frame 0) and passes it to
`buildScene(room, time, frame)`; `mascot()` lifts the mascot 14 units on odd
frames. Nothing else is frame-driven yet, the CSS animations are still in.
`/room debug` now also prints frame ticks and backdrop draws, to tell a dead
timer from a redraw that does not reach the screen.

Questions put to the user: does the mascot move, does the whole room flash on
each tick, does the app lag when typing or scrolling.

- Moves cleanly: port the rest (breathing, typing arms, tail, Zzz, blink,
  kitten walk) to functions of `frame`, drop the CSS keyframes and `enter`,
  cache the static room per room and minute so a tick rebuilds only the cast,
  stop ticking when asleep or long idle, then remove `motionTest()`, the
  counting hook and `/room debug`.
- Flickers or lags: route 2, a `Client` surface module (`ClientProps`,
  `surface.every` in the types).
- `$.ui.invalidate('ui.render')` was not used: it redraws every row, where a
  state write redraws only the hooks that read the key.

Checks run on the spike: validate passed (icon warning only), `tsc -p .`
clean, 7 tests pass.

## Eighth round (2026-11-15): the whole-scene swap flickers

User's answer to the spike: "Moves but flickers" (not said: whole room or
mascot only, or lag). Route 2 is ruled out: a `Client` draws with the
terminal's element table, which has no `Svg`.

Spike now in the build, awaiting the user's look, switched with the temporary
`/room spike a|b|c` (default a). All variants strip every `animation:`
declaration (`still()` in `scene.js`), so a swap has nothing to restart.

- a: the whole scene swaps per tick, as before but without CSS animation.
- b: the room is one `Svg` that never changes (`buildScene(..., 'room')`); a
  transparent cast-only `Svg` in an absolute `Box` over it swaps.
- c: as b, but both cast frames stay mounted and the tick flips `display`.

Risk in b and c: an `Svg` nested in a `Box` may not be sized to the window.
If c still flickers, try moving the hidden layer off-screen in place of
`display: none`. If all three flicker, frame swaps are a limit of this build.
The pose assertion removed from the layered test was wrong (the rest pose is
rolled at random), not a product bug.

## Ninth round (2026-11-15): sides-only room, default chat, CSS mode

User, after restarting the app: "it's now animated", cannot tell which spike
is best, and hovering a user message (the row with copy, sent time) flickers.
Two requests: nothing behind the chat (move everything to the sides), and
undo every change to the chat interface.

Done:

- **Layout** (`scene.js`): left side (x under 470) has the window, scaled to
  0.6 (`WINDOW`), over the lamp and couch (`LOUNGE`), plus the cat bed. Right
  side (x over 1130) has the clock, poster, shelf, plant and desk. The
  bookshelf and the rug are gone. Every mascot and kitten spot is on a side
  (a test holds this); the kitten's walk is 340 units on the left floor;
  confetti falls on the sides only.
- **Narrow windows**: each side is a class (`zl`, `zr`) that `FIT` media rules
  move inward by what `slice` crops below 16:9. The wash's window holes are a
  mask that moves with `zl`.
- **Chat reverted**: the reply and small-row card hooks, `/room veil`, the
  `glass` setting, the row-counting hook, `/room debug` and `motionTest()` are
  removed. The only `ui.render` hook left is `Backdrop`.
- **Motion modes**, `/room motion css|a|b|c` (default `css`, resets on reload):
  `css` draws the scene with its own CSS animation and never reads the frame
  key, so nothing redraws on a timer. `a`, `b`, `c` are the eighth round's
  frame-swap variants (bob only).

Why CSS is the default: the hover flicker is most likely the 650 ms state
write redrawing the app; CSS mode has no such write. Earlier rounds found CSS
frozen in the app, but that was before the restart, and it was never retested.

Next step, from the user's answers:

1. In `css` mode, does anything move (breathing, tail, clouds) and is the
   hover flicker gone? If yes: delete the frame modes, the `frame` key,
   `still()`, `part` and `isFramed`; done.
2. If `css` is frozen: `/room motion c` (then b, a). Is the hover flicker
   still there now that the card hooks are gone? If one mode is clean, port
   the poses to frames and drop CSS animation. If every frame mode flickers
   the hover row, that is a limit of this build: say so.
3. Is any of the room hidden by the sidebar, or does it reach behind the
   chat? Tune `WINDOW`, `LOUNGE`, the `at()` spots and the 470/1130 bounds.

Preview without the app: render `buildScene` to an HTML file with node and
open it over a local server (the browser pane refuses `file://`).

## Tenth to thirteenth rounds (2026-11-15): layout, wall, and why it was frozen

One session. The earlier sections of this file were rebuilt from the ninth
round's copy after an editing slip, so these four rounds are a summary.

**Tenth: layout and wall.** User: hover flicker gone; objects still behind
the chat; wall too light. Tuned to the user's screenshot (1919 px wide window,
sidebar collapsed, chat glass about 440 to 1450 px, so canvas x 367 to 1208):
left content stays at x <= 360 (`WIN` scale .48 for the window, `LOUNGE`
scale .78, cat bed and cast spots moved), right content at x >= 1225 (`DESK`
shifts the desk group 40 right; clock and poster above the shelf; plant on
the floor in front of the tower). A test holds the 360 and 1225 bounds. The
wall is `WALL` in `scene.js`, `#4b5663` to `#566270` (was cream).

**The restart confound.** The ninth round's motion modes lived in a module
variable that reset on reload, and the user restarted the app after each
command, so their report on modes b and c was really about the default. Any
future mode a person compares must be kept in `$.store`, and a mode switch
must call `$.ui.invalidate('ui.render')`: the Backdrop hook is not re-run by
a module variable changing, nor by writing an unchanged state value.

**Lead from a working mod.** github.com/hamzafer/claude-code-mods,
`mods/gotham-night` (same build, 2.1.325): its backdrop animates in Desktop
with plain CSS in an `isInteractive` Svg. Its `flock.ts` notes that one bad
animation froze the whole scene there; suspects named were scale() mixed into
path keyframes, cubic-bezier easing and fill-mode `both`. The room's
keyframes were cut to that subset (no keyframe mixes scale with translate or
rotate; no `both`; no animated filter) and a test holds it. That alone did
not unfreeze the room, and whether those three matter here was never tested
separately.

**Eleventh and twelfth: the scans.** A two-dot probe scene bounced in the
app, the room did not. Four scans followed, each a set of variants the user
stepped through, with a bouncing dot as the "is this document alive" signal:

1. By animation group (breathe, moves, turns, scales, fades): all frozen,
   even the still room with only the dot. So not an animation.
2. By structure, one suspect out at a time (rule order, `FIT` media rules,
   keyframes, uses of mask, clip and filter), with squares showing that
   rules at the start, middle and end of the stylesheet all applied: all
   frozen. The bare probe plus 1200 filler shapes (69k) bounced: not size.
3. Mask out, clip paths out, both out: frozen. Both out plus the filter and
   `FIT` out: BOUNCED.
4. On the fixed room, one suspect put back at a time: mask fine, clip path
   fine, `FIT` media rules frozen, a `filter:brightness` rule frozen.

**Thirteenth: the fix and the cleanup.**

- No `filter`: `shaded()` multiplies every hex colour in the cast by
  `LIGHT[phase].chars`, which is what `brightness()` did.
- No `@media`: `FIT` is gone, so nothing moves the sides inward when the
  window is narrower than 16:9.
- The wash is one evenodd path with a hole per window pane, and the sky is
  unclipped under a cover path in the wall's gradient (`wallOver`, the wall
  gradient in the window's scaled coordinates). Both date from when mask and
  clip path were suspects; they work, so they stayed.
- Removed: `/room motion`, the frame mode with its timer and `frame` key,
  `still()`, `isFramed`, the probe and the scans. `buildScene(room, time)`
  is the whole interface; the Backdrop hook draws it with `isInteractive` on
  desktop. A stale `motion` key may remain in the mod's store; nothing reads
  it.

Preview without the app: render `buildScene` to an HTML file with node and
open it over a local server (the browser pane refuses `file://`). A centred
1010 px overlay stands in for the chat glass at a 1919 x 972 viewport. The
browser pane's animation timeline does not advance while the pane is hidden,
so movement cannot be judged there.



## Decisions and why

- **State writes only on real change**: each write redraws and restarts
  animations. Rest and kitten poses are rolled in event handlers and stored,
  never in the render hook (it re-runs on resize).
- **No theme colors set**: the app keeps its own light or dark panels; only
  the backdrop and glass are set.
- **Own mascot art**: an original boxy orange critter, not the official
  artwork.
- **"Feature done" = a successful `git commit`**: the engine has no such event.
- **No end signal for background tasks**: the hourglass clears at the next
  turn start, not when the task exits.
- **A PR merged on github.com is not seen**: only `gh pr merge` run in the
  session. Polling was left out.
- `$` may only be passed to top-level functions (validator rule), hence the
  top-level `sync` and `flash`.

## How to verify

```
claude plugin validate <mod folder>
claude plugin test <mod folder>
```

Type-check with `tsc -p .` once the engine has laid its types in
`.claude-plugin/types/` (it does so when it loads the plugin from this
folder). Preview the scene with `node tools/preview.mjs`.

In the app: `/room dawn`, `/room night sleep`, `/room fireworks`,
`/room confetti`, `/room rain`, then `/room auto`.
