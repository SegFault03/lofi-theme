// Draws the room in a browser, without the Claude app: `node tools/preview.mjs`
// then open http://localhost:4173/. Not part of the plugin; nothing loads it.
//
// The query names the room: ?phase=night&mascot=sleep&kitten=sleep&fx=none
// &rain=1&waiting=1&h=23&m=59&s=50&clock=12h&wall=plum&nokitten=1
// Leave h/m/s out for the time now. A grey panel stands in for the chat.
// Add &fit=1 to see the whole room in a small window, and &bare=1 for no panel.
import { createServer } from 'node:http'

import { buildScene } from '../hooks/scene.js'

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
  }
  const time = {
    h: number('h', now.getHours()),
    m: number('m', now.getMinutes()),
    s: number('s', now.getSeconds()),
  }
  const look = {
    clock: query.get('clock') ?? '24h',
    wall: query.get('wall') ?? 'slate',
    hasKitten: !query.has('nokitten'),
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
