# lofi-theme

A Claude Code plugin of function hooks (a "mod") named `lofi-theme`: a living
room drawn as the backdrop of the Claude desktop app, lit by the clock, where
a mascot and a kitten react to the session. The repository is also its own
marketplace (`.claude-plugin/marketplace.json`, source `./`).

`HANDOFF.md` holds the current state, open questions and the history of what
was tried. Read its first section before starting work, and update it after
each milestone or change of direction.

## Layout

| Path | Job |
| --- | --- |
| `.claude-plugin/plugin.json` | Manifest: name, version, `userConfig` options, the state contract's path. |
| `.claude-plugin/marketplace.json` | Lists the plugin so the repository installs as a marketplace. |
| `hooks/hooks.json` | Names the one hooks module. |
| `hooks/register.tsx` | Event wiring. Session facts live in the module object `S`, the options in `O`, what is drawn in `$.state`. |
| `hooks/scene.js` | `buildScene(room, time, look)`: the whole backdrop as one SVG string. Pure. |
| `hooks/logic.js` | Pure decisions: phase by hour, rest and kitten poses, shell-command classification, rainy days. |
| `hooks/*.d.ts` | Types for the two `.js` files. Keep them in step by hand. |
| `types/index.d.ts` | The `$.state` contract (`lofi-theme.room`, `lofi-theme.resync`) and the shared types. |
| `hooks/register.test.tsx` | Tests, run by the engine's own kit. |
| `tools/preview.mjs` | Local preview server. Not part of the plugin. |

## Commands

```
claude plugin validate .      # manifest, marketplace, hooks module, state keys
claude plugin test .          # the tests, against the engine itself
node tools/preview.mjs        # http://localhost:4173/?phase=night&mascot=sleep&fit=1
tsc -p .                      # type-check (see below)
```

`tsconfig.json` extends `.claude-plugin/types/tsconfig.json`, which the engine
writes when it loads the plugin from this folder (`claude --plugin-dir .`, or
an install from the folder). That folder ignores itself in git, so a fresh
clone has no types until the plugin has been loaded once. TypeScript is not a
dependency of this repository: use any installed `tsc`.

Run validate and test before calling a change done. Neither paints: a change
to the scene also needs a look in the preview, and a change to animation
needs a look in the desktop app itself.

## Rules the scene must keep

These were found the hard way in the desktop app; tests hold most of them.

- **No CSS `filter` and no `@media` rule anywhere in the SVG.** Either one
  stills every animation in the document. A mask and a clip path are fine.
  Darken colours with `shaded()`, not `brightness()`.
- **No inline `style` attributes in the output.** `hoist()` moves them into
  the `<style>` block; write `style="animation:..."` in the builders and let
  it do so.
- **Keyframes stay in the proven subset.** No keyframe mixes `scale` with
  `translate` or `rotate`, no fill-mode `both`, no `cubic-bezier`. Name
  keyframes with letters only (a test matches `@keyframes [a-z]+`).
- **Under 131,072 characters** for every combination of phase, pose and
  effect. The largest is near 64k.
- **The middle stays empty.** Everything sits at canvas x <= 360 or
  x >= 1225 (the canvas is 1600 x 900); the chat covers the rest.
- **Write state only on a real change.** Every `$.state` write swaps the
  document and restarts its animations. So poses are rolled in event handlers
  and stored, never in the render hook, and the clock is driven by CSS: each
  glyph is lit for its slot of a long `steps(1)` animation, placed by a
  negative delay (`clockColumns`).
- **Give a non-lit clock glyph `opacity="0"` as an attribute**, so a surface
  that draws the scene still shows the right time.

## Rules the hooks module must keep

- `$` is passed only to top-level functions (a validator rule): hence the
  top-level `sync`, `flash` and `dress`.
- State keys are written as literals in `atom({ plugin: 'lofi-theme', key })`
  and declared in `types/index.d.ts`. Change the `shape` tag when `Room`'s
  fields change.
- Display code never blocks the session: hooks wrap their own work in `try`
  and always return `next(e)`'s answer. The `tool.call` hook has a `.catch`.
- An option is declared in `plugin.json`'s `userConfig`, read once in
  `readOptions`, documented in the README's table, and covered by a test that
  passes `{ options }`.
- The plugin's name may not start with `claude-` (reserved). The scene id
  stays `living-room`.

## Conventions

- Prose in comments and docs is plain and short; comments say why.
- Booleans read `is…` or `has…`.
- Bump `version` in `plugin.json` for anything a person would notice.
- The licence is MIT (`LICENSE`, and `license` in `plugin.json`).
