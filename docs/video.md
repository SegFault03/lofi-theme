# Recording the demo

How to stage one take in the desktop app that shows the room at work. The
room reacts to what the session really does, so the take is a real, small
task in a throwaway repository.

## 1. The demo repository

Everything the TV shows comes from here: the folder's name, the branch, the
lines not yet committed. Nothing in it is private. In Git Bash:

```bash
mkdir -p ~/demo/moonlight-notes && cd ~/demo/moonlight-notes && git init -q -b main
```

```bash
cat > package.json <<'EOF'
{ "name": "moonlight-notes", "type": "module", "scripts": { "test": "node --test" } }
EOF
cat > notes.js <<'EOF'
// The notes, newest first.
const notes = []

export function add(text) {
  notes.unshift({ text, at: Date.now() })
  return notes.length
}

export function all() {
  return [...notes]
}
EOF
cat > notes.test.js <<'EOF'
import assert from 'node:assert'
import { test } from 'node:test'

import { add, all } from './notes.js'

test('a note is added first', () => {
  add('water the plant')
  add('feed the kitten')
  assert.equal(all()[0].text, 'feed the kitten')
})
EOF
git add -A && git commit -q -m "Start the notes" && git switch -q -c add-search && npm test
```

The last line should end in `pass 1`. To take it again, run
`git reset -q --hard main` on the branch.

## 2. The session

- Open `~/demo/moonlight-notes` in the desktop app, in a new chat. Name the
  chat something short (`Search the notes`): the TV shows it.
- Plugin options: `timeOfDay` at `night`, the rest as they are.
- Window at 1920 x 1080, sidebar collapsed, no side pane open.
- Let the session edit and run commands without asking (accept edits, and
  allow `npm test` and `git`), or each prompt for permission stalls the take.

## 3. The prompt

Type it by hand while recording: the mascot looks up at the first key.

```text
Add a search to the notes. Keep a task list of exactly these five steps and work through them one at a time: read notes.js and its test; add a find(word) function that returns the notes whose text contains the word, ignoring case; add a test for it; run npm test by itself; commit with git commit by itself.
```

Why it is worded so:

- **A task list of five steps** puts five notes under the shelf, and they
  tick off one by one.
- **Read, then edit** shows the reading screen and then the typing one.
- **`npm test` by itself** is what the room knows as a test run: the mascot
  cheers and the ticker says `Tests passed`.
- **`git commit` by itself** brings the confetti. Chained to the test in one
  command, only the commit would show.

## 4. The beats

| Beat | You | The room |
| --- | --- | --- |
| 1 | Wait three seconds | Mascot on the couch, the clock runs |
| 2 | Type the prompt | Mascot looks up |
| 3 | Send it | Mascot dashes to the desk and thinks |
| 4 | Wait | Notes go up; the monitor follows each tool; notes tick off |
| 5 | Wait | Tests pass: a cheer |
| 6 | Wait | Commit: confetti |
| 7 | Type `/room fireworks` | Fireworks outside; the kitten starts |
| 8 | Type `/room auto` | The room follows the session again |

The whole take runs about a minute. Cut it to 15 to 20 seconds: keep beats
2, 3, a few seconds of 4, then 6 and 7.

## 5. More shots

Five seconds each. A `/room` pose stays until `/room auto`.

- The light: `/room dawn`, `/room day`, `/room golden`, `/room dusk`,
  `/room night`.
- Rain: `/room rain`, and `/room clear`.
- Asleep: `/room night sleep kitten-sleep`.
- Helpers: `Use three subagents, each to count the lines of one file here.`
- A facepalm: break the test's expected text, then `Run npm test by itself.`
