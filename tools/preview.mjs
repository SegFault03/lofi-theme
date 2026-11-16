// Draws the room in a browser, without the Claude app: `node tools/preview.mjs`
// then open http://localhost:4173/. Not part of the plugin; nothing loads it.
//
// The query names the room: ?phase=night&mascot=sleep&kitten=sleep&fx=none
// &rain=1&waiting=1&h=23&m=59&s=50&clock=12h&wall=plum&nokitten=1
// Leave h/m/s out for the time now. A grey panel stands in for the chat.
// Add &fit=1 to see the whole room in a small window, and &bare=1 for no panel.
import { createServer } from 'node:http'

import { buildScene } from '../hooks/scene.js'
import { dateLabel, greeting } from '../hooks/logic.js'

const PORT = Number(process.env.PORT ?? 4173)

function page(query) {
  const now = new Date()
  const number = (key, fallback) => (query.has(key) ? Number(query.get(key)) : fallback)
  const room = {
    phase: query.get('phase') ?? 'day',
    mascot: query.get('mascot') ?? 'phone',
    kitten: query.get('kitten') ?? 'loaf',
    fx: query.get('fx') ?? 'none',
    isRaining: query.has('rain'),
    isWaiting: query.has('waiting'),
    // &doing=read (edit, shell, web) for the tool in hand, with &mascot=work.
    doing: query.has('doing') ? { kind: query.get('doing'), label: query.get('label') ?? `${query.get('doing')} scene.js` } : undefined,
    // &helpers=2 for subagents at work.
    helpers: number('helpers', 0),
    // &from=phone,loaf for the poses it just left: each load plays the move.
    // &since=0.5 for a drawing that many seconds into it.
    was: query.has('from') ? { mascot: query.get('from').split(',')[0], kitten: query.get('from').split(',')[1] ?? (query.get('kitten') ?? 'loaf') } : undefined,
    at: now.getTime() - number('since', 0) * 1000,
  }
  const time = {
    h: number('h', now.getHours()),
    m: number('m', now.getMinutes()),
    s: number('s', now.getSeconds()),
    ms: now.getMilliseconds(),
    now: now.getTime(),
    day: dateLabel(now),
  }
  const look = {
    clock: query.get('clock') ?? '24h',
    wall: query.get('wall') ?? 'slate',
    hasKitten: !query.has('nokitten'),
    // &tv=1 for sample figures, &tv=empty for a session with none yet.
    tv: !query.has('tv')
      ? undefined
      : query.get('tv') === 'empty'
        ? { project: '', greeting: greeting(now.getHours(), 'ada'), context: { window: 200000 }, feed: ['turn 0', 'just started'] }
        : {
            project: query.get('project') ?? 'lofi-theme',
            chat: query.get('chat') ?? 'Add a live TV to the room',
            branch: query.has('nobranch') ? undefined : (query.get('branch') ?? 'main'),
            // &diff=133,32 and &pr=failing (or any state) for the branch line.
            diff: query.has('diff') ? { added: Number(query.get('diff').split(',')[0]), removed: Number(query.get('diff').split(',')[1] ?? 0) } : undefined,
            pr: query.get('pr') ?? undefined,
            // &prn=16 for its number.
            prNumber: query.has('prn') ? Number(query.get('prn')) : undefined,
            fiveHour: { percent: number('p5', 42), resets: '14:30' },
            week: { percent: number('pw', 18), resets: 'Tue 09:00' },
            context: { percent: number('ctx', 37), tokens: number('ctx', 37) * 2000, window: 200000 },
            feed: ['turn 12', '$1.84', 'since 09:15', ...(number('p5', 42) > 80 ? ['Low on 5h usage!'] : []), ...(number('pw', 18) > 80 ? ['Low on weekly usage!'] : []), ...(number('ctx', 37) > 80 ? ['Context limit reaching soon!'] : [])],
          },
  }
  const drawn = buildScene(room, time, look)
  // The app crops the room to fill the window; `fit` shows all of it instead.
  const svg = query.has('fit') ? drawn.replace('xMidYMax slice', 'xMidYMid meet') : drawn

  return `<!doctype html><meta charset="utf-8"><title>lofi-theme preview</title>
<style>html,body{margin:0;height:100%;background:#111;overflow:hidden}
svg{position:fixed;inset:0;width:100%;height:100%}
.chat{position:fixed;top:0;bottom:0;left:50%;width:1010px;max-width:60%;transform:translateX(-50%);background:#1f1f1ecc;color:#aaa;font:14px ui-monospace,monospace;padding:16px;box-sizing:border-box}</style>
${svg}${query.has('bare') ? '' : `<div class="chat">chat sits here &middot; ${drawn.length} of 131072 characters</div>`}`
}

createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${PORT}`)

  if (url.pathname !== '/') {
    response.writeHead(404).end()

    return
  }
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  response.end(page(url.searchParams))
}).listen(PORT, '127.0.0.1', () => {
  console.log(`http://localhost:${PORT}/`)
})
