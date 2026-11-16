// The living room, drawn as one SVG string. Pure: the same room state and
// time always give the same document, so a redraw never reshuffles the books.
//
// Canvas is 1600 x 900. The wall meets the floor at y = 640. The middle, where
// the chat sits, stays bare wall and floor. Left side: the window over the
// couch, the lamp, the cat bed. Right side: the plant, the digital clock and
// the desk.

const W = 1600
const H = 900
// The walls on offer, top to bottom: each dark enough that the chat's panels
// stand off it. `slate` is the one the room was drawn for.
export const WALLS = {
  slate: ['#4b5663', '#566270'],
  plum: ['#54485f', '#60536c'],
  forest: ['#45584f', '#50645a'],
  clay: ['#65514b', '#715c55'],
}

// One row per lighting phase. `sky` is top and bottom of the window gradient,
// `orb` the sun or moon [x, y, r, color], `tint`/`dim` the wash over the room,
// `chars` how bright the mascot and kitten stay under it.
const LIGHT = {
  dawn: {
    sky: ['#f29c86', '#fde6c4'],
    orb: [578, 398, 34, '#ffe2b0'],
    stars: 0,
    cloud: ['#ffd9cf', 0.8],
    city: '#9a86a6',
    hill: '#c7a9b4',
    lit: 0.35,
    tint: '#5a3c78',
    dim: 0.14,
    lamp: 0,
    chars: 0.96,
    beam: ['#ffd9b0', 0.12],
  },
  day: {
    sky: ['#5aa5e6', '#d7edf8'],
    orb: [800, 182, 30, '#fff6c2'],
    stars: 0,
    cloud: ['#ffffff', 0.92],
    city: '#86a2bd',
    hill: '#a9c6b4',
    lit: 0,
    tint: '#000000',
    dim: 0,
    lamp: 0,
    chars: 1,
    beam: ['#fff7d6', 0.18],
  },
  golden: {
    sky: ['#ee7b43', '#fcd795'],
    orb: [1012, 378, 38, '#ffc063'],
    stars: 0,
    cloud: ['#ffd0a0', 0.75],
    city: '#8d5b54',
    hill: '#b97b5e',
    lit: 0.25,
    tint: '#ff8a3c',
    dim: 0.12,
    lamp: 0,
    chars: 0.98,
    beam: ['#ffb768', 0.24],
  },
  dusk: {
    sky: ['#29265a', '#d26a6c'],
    orb: null,
    stars: 0.45,
    cloud: ['#8f6f9c', 0.4],
    city: '#1f1c40',
    hill: '#3a2f5c',
    lit: 0.85,
    tint: '#221c52',
    dim: 0.34,
    lamp: 1,
    chars: 0.88,
    beam: null,
  },
  night: {
    sky: ['#070c22', '#1c2754'],
    orb: [985, 196, 26, '#f3f0dc'],
    stars: 1,
    cloud: ['#3b4470', 0.35],
    city: '#0b1130',
    hill: '#141b44',
    lit: 1,
    tint: '#070a24',
    dim: 0.54,
    lamp: 1,
    chars: 0.78,
    beam: ['#b8c8ff', 0.07],
  },
}

// A small seeded generator (mulberry32).
function rng(seed) {
  let a = seed >>> 0

  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const n = v => Math.round(v * 10) / 10

function rect(x, y, w, h, fill, extra = '') {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}" ${extra}/>`
}

// `.c` turns about its own middle, `.f` about its feet, `.t` about its top.
const CSS = `
.c{transform-box:fill-box;transform-origin:center}
.f{transform-box:fill-box;transform-origin:50% 100%}
.t{transform-box:fill-box;transform-origin:50% 0}
.l{transform-box:fill-box;transform-origin:0 50%}
text{font-family:ui-monospace,Consolas,Menlo,monospace;font-weight:700}
@keyframes breathe{50%{transform:scaleY(1.045)}}
@keyframes bob{50%{transform:translateY(-3px)}}
@keyframes tap{50%{transform:translateY(5px)}}
@keyframes zz{0%{opacity:0;transform:translate(0px,0px)}20%{opacity:1}100%{opacity:0;transform:translate(26px,-48px)}}
@keyframes sway{0%,100%{transform:rotate(-13deg)}50%{transform:rotate(13deg)}}
@keyframes leaf{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2.5deg)}}
@keyframes hop{0%,100%{transform:translateY(0)}35%{transform:translateY(-16px)}70%{transform:translateY(0)}}
@keyframes jump{0%,100%{transform:translateY(0px)}45%{transform:translateY(-62px)}}
@keyframes tw{50%{opacity:.2}}
@keyframes drift{from{transform:translateX(-300px)}to{transform:translateX(640px)}}
@keyframes rain{to{transform:translate(-22px,110px)}}
@keyframes burst{0%,40%{transform:scale(.05)}100%{transform:scale(1)}}
@keyframes glow{0%,40%{opacity:0}46%{opacity:1}70%{opacity:1}100%{opacity:0}}
@keyframes rise{0%{transform:translateY(170px);opacity:.9}40%{transform:translateY(0);opacity:.9}41%,100%{opacity:0}}
@keyframes flash{0%,40%{opacity:0}47%{opacity:.5}100%{opacity:0}}
@keyframes fall{from{transform:translateY(-90px)}to{transform:translateY(1000px)}}
@keyframes blink{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
@keyframes steam{0%{opacity:0;transform:translateY(0)}30%{opacity:.7}100%{opacity:0;transform:translateY(-24px)}}
@keyframes type{0%{transform:scaleX(0)}55%,100%{transform:scaleX(1)}}
@keyframes clkh{0%{opacity:1}4.16667%,100%{opacity:0}}
@keyframes clkt{0%{opacity:1}16.66667%,100%{opacity:0}}
@keyframes clko{0%{opacity:1}10%,100%{opacity:0}}
@keyframes walk{0%,100%{transform:translateX(0px)}50%{transform:translateX(165px)}}
@keyframes face{0%{transform:scaleX(1)}50%,100%{transform:scaleX(-1)}}
@keyframes step{50%{transform:translateY(-4px)}}
@keyframes tilt{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(7deg)}}
@keyframes roll{0%,100%{transform:translateX(0px)}50%{transform:translateX(18px)}}
@keyframes saver{0%,100%{transform:translate(0,0)}25%{transform:translate(64px,30px)}50%{transform:translate(22px,46px)}75%{transform:translate(76px,10px)}}
@keyframes flip{0%,70%{transform:rotate(0)}100%{transform:rotate(180deg)}}
@keyframes pulse{50%{opacity:.5}}
@keyframes pop{0%{transform:scale(0)}60%{transform:scale(1.3)}100%{transform:scale(1)}}
@keyframes shake{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
@keyframes cool{0%{opacity:0;transform:translateY(0)}30%{opacity:.8}100%{opacity:0;transform:translateY(34px)}}
@keyframes scan{0%,100%{transform:translateY(0px)}50%{transform:translateY(51px)}}
@keyframes gone{from{opacity:1}to{opacity:0}}
@keyframes show{from{opacity:0}to{opacity:1}}
@keyframes tick{from{transform:translateX(232px)}to{transform:translateX(-600px)}}
`

// ---------------------------------------------------------------- outside

const PANES = [
  [512, 186],
  [706, 188],
  [902, 186],
]
const GLASS = { x: 512, y: 122, w: 576, h: 316 }

function outside(room, L) {
  const r = rng(7)
  const out = []
  const isShow = room.fx === 'fireworks'

  out.push(rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h, 'url(#sky)'))

  if (L.stars > 0 || isShow) {
    const opacity = Math.max(L.stars, isShow ? 0.5 : 0)

    for (let i = 0; i < 42; i++) {
      const x = GLASS.x + r() * GLASS.w
      const y = GLASS.y + r() * 200
      const size = 0.8 + r() * 1.3
      out.push(
        `<circle cx="${n(x)}" cy="${n(y)}" r="${n(size)}" fill="#fff" opacity="${n(opacity)}" style="animation:tw ${n(2 + r() * 3)}s ${n(-r() * 4)}s infinite"/>`,
      )
    }
  }

  if (L.orb && !room.isRaining) {
    const [x, y, size, color] = L.orb
    out.push(
      `<circle cx="${x}" cy="${y}" r="${size * 2.1}" fill="${color}" opacity=".16"/>`,
      `<circle cx="${x}" cy="${y}" r="${size}" fill="${color}"/>`,
    )
    if (room.phase === 'night') {
      out.push(
        `<circle cx="${x - 8}" cy="${y - 6}" r="5" fill="#d8d4bd"/><circle cx="${x + 9}" cy="${y + 7}" r="3.5" fill="#d8d4bd"/>`,
      )
    }
  }

  const [cloudColor, cloudOpacity] = room.isRaining
    ? ['#8e97a8', 0.95]
    : L.cloud
  const clouds = room.isRaining ? 6 : 3

  for (let i = 0; i < clouds; i++) {
    const y = 150 + r() * 110
    const scale = 0.8 + r() * 0.7
    const seconds = 110 + r() * 90
    out.push(
      `<g transform="translate(${GLASS.x},${n(y)}) scale(${n(scale)})"><g style="animation:drift ${n(seconds)}s ${n(-r() * seconds)}s linear infinite" fill="${cloudColor}" opacity="${cloudOpacity}"><ellipse cx="0" cy="0" rx="46" ry="15"/><ellipse cx="-22" cy="-10" rx="24" ry="15"/><ellipse cx="14" cy="-14" rx="28" ry="18"/></g></g>`,
    )
  }

  out.push(
    `<path d="M512 438V392q70-34 150-12t150-10 140 6 136-18V438Z" fill="${L.hill}"/>`,
  )

  // The skyline, with windows that light up as it gets dark.
  let x = GLASS.x - 6

  while (x < GLASS.x + GLASS.w) {
    const w = 26 + r() * 36
    const h = 34 + r() * 96
    const top = 438 - h
    out.push(rect(x, top, w, h, L.city))
    if (r() > 0.7) out.push(rect(x + w / 2 - 1, top - 14, 2, 14, L.city))
    for (let wy = top + 8; wy < 430; wy += 13) {
      for (let wx = x + 5; wx < x + w - 6; wx += 10) {
        if (r() > 0.55 && L.lit > 0) {
          out.push(
            rect(wx, wy, 4, 6, '#ffd98a', `opacity="${n(L.lit * (0.5 + r() * 0.5))}"`),
          )
        }
      }
    }
    x += w + 2 + r() * 8
  }

  if (room.isRaining) {
    out.push(rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h, '#56607a', 'opacity=".32"'))
    for (let i = 0; i < 46; i++) {
      const rx = GLASS.x + r() * (GLASS.w + 40)
      const ry = GLASS.y - 100 + r() * GLASS.h
      out.push(
        `<line x1="${n(rx)}" y1="${n(ry)}" x2="${n(rx - 5)}" y2="${n(ry + 24)}" stroke="#dfe9ff" stroke-width="1.6" opacity=".55" style="animation:rain ${n(0.5 + r() * 0.4)}s ${n(-r())}s linear infinite"/>`,
      )
    }
  }

  if (isShow) {
    // By day the sky dims a little so the show reads.
    if (L.stars < 0.4) {
      out.push(rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h, '#0b1030', 'opacity=".5"'))
    }
    const colors = ['#ff5d73', '#ffd166', '#7ae582', '#6ecbff', '#c9a0ff', '#ff9f5a', '#fff']
    const spots = [
      [600, 210],
      [760, 170],
      [940, 220],
      [1030, 175],
      [680, 265],
      [860, 245],
      [565, 165],
    ]

    spots.forEach(([bx, by], i) => {
      const color = colors[i % colors.length]
      const seconds = n(2.4 + r() * 1.2)
      const delay = n(-r() * 3)
      const rays = []

      for (let k = 0; k < 14; k++) {
        const angle = (k / 14) * Math.PI * 2
        const inner = 10
        const outer = k % 2 ? 44 : 60
        rays.push(
          `<line x1="${n(Math.cos(angle) * inner)}" y1="${n(Math.sin(angle) * inner)}" x2="${n(Math.cos(angle) * outer)}" y2="${n(Math.sin(angle) * outer)}"/>`,
          `<circle cx="${n(Math.cos(angle) * (outer + 6))}" cy="${n(Math.sin(angle) * (outer + 6))}" r="2.2" fill="${color}" stroke="none"/>`,
        )
      }
      out.push(
        `<g transform="translate(${bx},${by})"><circle r="2.4" fill="#fff" style="animation:rise ${seconds}s ${delay}s linear infinite"/><circle r="80" fill="${color}" class="c" style="animation:flash ${seconds}s ${delay}s linear infinite" opacity="0"/><g style="animation:glow ${seconds}s ${delay}s linear infinite"><g class="c" stroke="${color}" stroke-width="3" stroke-linecap="round" style="animation:burst ${seconds}s ${delay}s ease-out infinite">${rays.join('')}</g></g></g>`,
      )
    })
  }

  // The sky is not clipped: a cover in the wall's own gradient, with a hole for the glass,
  // hides what drifts past the frame.
  const cover = `<path d="M-100 -60H1700V640H-100ZM${GLASS.x} ${GLASS.y}h${GLASS.w}v${GLASS.h}h-${GLASS.w}Z" fill-rule="evenodd" fill="url(#wallOver)"/>`

  return `<g>${out.join('')}${cover}</g>`
}

function windowFrame(L) {
  const frame = '#f4eee2'
  const bulbs = []
  const colors = ['#ffd166', '#ff7b89', '#7ae582', '#6ecbff']

  for (let i = 0; i < 15; i++) {
    const t = i / 14
    const x = 516 + t * 568
    const y = 112 + Math.sin(t * Math.PI) * 14
    bulbs.push(
      `<circle cx="${n(x)}" cy="${n(y)}" r="${L.lamp ? 9 : 0}" fill="${colors[i % 4]}" opacity=".25"/><circle cx="${n(x)}" cy="${n(y)}" r="3.4" fill="${colors[i % 4]}" opacity="${L.lamp ? 1 : 0.55}" ${L.lamp ? `style="animation:tw ${n(1.6 + (i % 5) * 0.4)}s ${n(-i * 0.3)}s infinite"` : ''}/>`,
    )
  }

  return [
    `<path d="M500 110H1100V450H500Z M512 122V438H698V122Z M706 122V438H894V122Z M902 122V438H1088V122Z" fill="${frame}" fill-rule="evenodd"/>`,
    rect(486, 448, 628, 16, '#e3d8c5', 'rx="3"'),
    rect(486, 462, 628, 4, '#c9bca6'),
    rect(452, 90, 696, 6, '#4a3b33', 'rx="3"'),
    `<path d="M460 96h62q-10 120 2 220t-8 164h-56Z" fill="#c8674f"/><path d="M478 96q-8 190 4 384M500 96q-6 200 6 384" stroke="#a9523d" stroke-width="3" fill="none"/>`,
    `<path d="M1078 96h62v384h-56q-20-64-8-164t2-220Z" fill="#c8674f"/><path d="M1100 96q6 200-6 384M1122 96q8 190-4 384" stroke="#a9523d" stroke-width="3" fill="none"/>`,
    `<path d="M516 112Q800 142 1084 112" stroke="#3a322c" stroke-width="1.5" fill="none"/>`,
    bulbs.join(''),
  ].join('')
}

// ------------------------------------------------------------------ room

// The digital clock's three columns: the hour as one two-digit glyph, then the
// minute's tens and ones. Each column is every glyph it will ever show, stacked
// in one spot; a glyph is lit for its `slot` seconds out of the column's whole
// turn, and its delay says how far into that turn it is now. So the clock
// keeps time by the document's own CSS, with no redraw each minute.
// Pure, and exported for the tests.
export function clockColumns(time, format = '24h') {
  const s = time.s ?? 0
  const hourLabel = k => String(format === '12h' ? ((k + 11) % 12) + 1 : k).padStart(2, '0')
  const column = (name, x, slot, labels, elapsed) => {
    const period = slot * labels.length

    return labels.map((label, k) => {
      // How far glyph k is into its own turn. JS `%` keeps the sign: wrap it.
      const into = (((elapsed - k * slot) % period) + period) % period

      return { name, x, label, period, delay: -into, isLit: into < slot }
    })
  }

  return [
    column('clkh', -24, 3600, Array.from({ length: 24 }, (_, k) => hourLabel(k)), time.h * 3600 + time.m * 60 + s),
    column('clkt', 16, 600, ['0', '1', '2', '3', '4', '5'], time.m * 60 + s),
    column('clko', 32, 60, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], (time.m % 10) * 60 + s),
  ]
}

// The clock stands on the shelf, between the cactus and the duck.
const CLOCK_AT = 'translate(1474,433)'

// The clock's case, under the room's light.
function clockCase() {
  return `<g transform="${CLOCK_AT}"><rect x="-56" y="-44" width="112" height="72" rx="9" fill="#2b2f3a"/><rect x="-50" y="-38" width="100" height="60" rx="5" fill="#10131a"/><rect x="-38" y="28" width="14" height="5" rx="2" fill="#22252e"/><rect x="24" y="28" width="14" height="5" rx="2" fill="#22252e"/></g>`
}

// Its digits, drawn over the wash so they glow at night as the screens do.
// A glyph that is not lit carries opacity 0 as an attribute, so a surface that
// draws the scene still (the mobile app) shows the time it was drawn at.
function clockFace(time, format) {
  const glyphs = clockColumns(time, format)
    .flat()
    .map(
      g =>
        `<text x="${g.x}" y="-7" font-size="26" text-anchor="middle"${g.isLit ? '' : ' opacity="0"'} style="animation:${g.name} ${g.period}s ${n(g.delay)}s steps(1) infinite">${g.label}</text>`,
    )
    .join('')

  // The date is plain text: the hooks draw the scene again when the day turns.
  const day = time.day ? `<g transform="${CLOCK_AT}"><text x="0" y="14" font-size="10.5" text-anchor="middle" fill="#c9905a">${esc(time.day)}</text></g>` : ''

  return `${day}<g transform="${CLOCK_AT}" fill="#ffb86b">${glyphs}<text x="0" y="-9" font-size="26" text-anchor="middle" style="animation:tw 2s steps(1) infinite">:</text></g>`
}

// The poster hangs where the TV does, so it is drawn only when there is no TV.
function poster() {
  return `<g transform="translate(40,30)">${[
    rect(1320, 150, 96, 124, '#2b2f3a', 'rx="4"'),
    rect(1326, 156, 84, 112, '#1b1e26', 'rx="2"'),
    `<text x="1368" y="216" font-size="34" text-anchor="middle" fill="#d97757">{ }</text>`,
    `<text x="1368" y="246" font-size="9" text-anchor="middle" fill="#9aa3b5">hello, world</text>`,
  ].join('')}</g>`
}

// A shelf with books, a cactus, room for the clock and the rubber duck, and
// a row of notes stuck under it.
function shelf() {
  const notes = [
    [1284, 368, '#ffe27a', -5],
    [1318, 372, '#ff9db0', 4],
    [1352, 366, '#9fe0b0', -3],
    [1386, 372, '#9fd0ff', 6],
    [1420, 367, '#ffe27a', 3],
  ]

  return `<g transform="translate(40,116)">${[
    rect(1246, 350, 300, 8, '#b98a5e', 'rx="2"'),
    rect(1262, 358, 6, 14, '#8f6843'),
    rect(1524, 358, 6, 14, '#8f6843'),
    `<g transform="translate(-56,0)">`,
    rect(1312, 300, 12, 50, '#6b7fd1', 'rx="1.5"'),
    rect(1325, 308, 10, 42, '#e9b44c', 'rx="1.5"'),
    rect(1336, 296, 14, 54, '#c9596b', 'rx="1.5"'),
    rect(1351, 312, 9, 38, '#7aa66a', 'rx="1.5"'),
    `<g transform="rotate(14 1374 350)">${rect(1362, 304, 12, 46, '#e8dfd0', 'rx="1.5"')}</g></g>`,
    `<g transform="translate(-78,0)">`,
    rect(1420, 330, 26, 20, '#c0694e', 'rx="3"'),
    `<rect x="1427" y="298" width="12" height="34" rx="6" fill="#3f8f5a"/><rect x="1415" y="310" width="9" height="16" rx="4.5" fill="#3f8f5a"/><rect x="1440" y="306" width="9" height="18" rx="4.5" fill="#3f8f5a"/></g>`,
    `<g transform="translate(20,0)"><ellipse cx="1492" cy="340" rx="15" ry="10" fill="#ffd23f"/><circle cx="1502" cy="328" r="8" fill="#ffd23f"/><path d="M1509 327l8 3-8 3Z" fill="#f08a24"/><circle cx="1504" cy="326" r="1.4" fill="#2b1d16"/></g>`,
    notes
      .map(
        ([x, y, color, turn]) =>
          `<g transform="rotate(${turn} ${x + 11} ${y + 11})">${rect(x, y, 22, 22, color)}<path d="M${x + 4} ${y + 8}h14M${x + 4} ${y + 13}h9" stroke="#2b1d16" stroke-width="1.4" opacity=".45"/></g>`,
      )
      .join(''),
  ].join('')}</g>`
}

// An air conditioner on the wall over the window. Its case goes under the
// wash; its light and the cool air go over it, and only while it runs.
const AC = { x: 114, y: 228, w: 150, h: 46 }

function airCase() {
  return [
    rect(AC.x, AC.y, AC.w, AC.h, '#e9edf2', 'rx="9"'),
    rect(AC.x, AC.y + 30, AC.w, 16, '#d5dbe3', 'rx="7"'),
    rect(AC.x + 12, AC.y + 36, AC.w - 24, 4, '#8791a6', 'rx="2"'),
    rect(AC.x + 12, AC.y + 10, 34, 3, '#c3cad6', 'rx="1.5"'),
    `<circle cx="${AC.x + AC.w - 14}" cy="${AC.y + 12}" r="2.6" fill="#8791a6"/>`,
  ].join('')
}

function airFlow() {
  const wisps = [0, 1, 2, 3, 4]
    .map(
      i =>
        `<path d="M${AC.x + 24 + i * 25} ${AC.y + AC.h + 6}q${i % 2 ? 5 : -5} 8 0 16" stroke="#d6f0ff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0" style="animation:cool 2.8s ${n(-i * 0.56)}s infinite"/>`,
    )
    .join('')

  return `<circle cx="${AC.x + AC.w - 14}" cy="${AC.y + 12}" r="2.6" fill="#7ae582" style="animation:pulse 2.4s infinite"/>${wisps}`
}

// How far the floor lamp's shade sits below where it was first drawn: a short
// lamp leaves the wall over it to the window.
const LAMP_CUT = 84
const SHADE = `<path d="M258 ${382 + LAMP_CUT}h54l-10-46h-34Z"`

function lamp(isOn) {
  return [
    `<ellipse cx="285" cy="668" rx="24" ry="6" fill="#3a322c"/>`,
    rect(283, 380 + LAMP_CUT, 4, 288 - LAMP_CUT, '#3a322c'),
    `${SHADE} fill="${isOn ? '#ffe9b0' : '#e6d6b0'}"/>`,
  ].join('')
}

function floor() {
  const out = [
    rect(0, 640, W, 260, '#b98a5e'),
    rect(0, 628, W, 12, '#f4eee2'),
    rect(0, 640, W, 3, '#8f6843', 'opacity=".5"'),
  ]

  for (let y = 684; y < H; y += 44) {
    out.push(rect(0, y, W, 2, '#8f6843', 'opacity=".28"'))
  }
  for (let i = 0; i < 16; i++) {
    out.push(rect(60 + i * 101, 640 + (i % 5) * 44, 2, 44, '#8f6843', 'opacity=".28"'))
  }
  return out.join('')
}

function couch() {
  return [
    rect(316, 660, 12, 18, '#3a322c'),
    rect(632, 660, 12, 18, '#3a322c'),
    rect(318, 536, 324, 100, '#3c6877', 'rx="22"'),
    rect(306, 598, 348, 64, '#4c7d8c', 'rx="16"'),
    rect(306, 640, 348, 22, '#427080', 'rx="10"'),
    rect(296, 566, 46, 98, '#5c93a3', 'rx="18"'),
    rect(618, 566, 46, 98, '#5c93a3', 'rx="18"'),
    `<g transform="rotate(9 580 580)">${rect(556, 558, 50, 44, '#e9b44c', 'rx="10"')}<path d="M566 568l30 24M596 568l-30 24" stroke="#c9952f" stroke-width="2"/></g>`,
  ].join('')
}

// The kitten's bed, right of the plant and of where the two of them play.
const BED_X = 300

function catBed() {
  return `<g transform="translate(${BED_X},${DROP})"><ellipse cx="0" cy="756" rx="50" ry="15" fill="#a94f63"/><ellipse cx="0" cy="752" rx="38" ry="9" fill="#d98294"/></g>`
}

function plant() {
  const leaves = [
    [-38, -46, -40],
    [-14, -72, -14],
    [14, -74, 12],
    [38, -44, 42],
    [-26, -22, -62],
    [28, -20, 62],
  ]

  return `<g transform="translate(58,${774 + DROP})"><g class="f" style="animation:leaf 8s infinite">${leaves
    .map(
      ([x, y, turn], i) =>
        `<path d="M0 0L${x} ${y}" stroke="#2f6e45" stroke-width="3"/><ellipse cx="${x}" cy="${y}" rx="13" ry="24" fill="${i % 2 ? '#3f8f5a' : '#327a4a'}" transform="rotate(${turn} ${x} ${y})"/>`,
    )
    .join('')}</g><path d="M-24 0h48l-6 66h-36Z" fill="#c0694e"/><rect x="-27" y="-4" width="54" height="10" rx="3" fill="#d17d62"/></g>`
}

// Where the one screen is: its picture, inside the bezel.
const PC = { x: 1357, y: 441, w: 108, h: 70 }

function desk() {
  return [
    rect(1192, 572, 10, 102, '#8f6843'),
    rect(1530, 572, 10, 102, '#8f6843'),
    // The tower under the desk.
    rect(1460, 590, 54, 84, '#23262e', 'rx="5"'),
    `<circle cx="1494" cy="646" r="13" fill="#15171c"/><circle cx="1494" cy="646" r="5" fill="#2d3039"/>`,
    rect(1180, 560, 372, 12, '#b98a5e', 'rx="3"'),
    rect(1180, 570, 372, 3, '#8f6843', 'opacity=".6"'),
    // The monitor: stand and bezel. Its screen is drawn above the wash.
    rect(PC.x + 49, 516, 10, 38, '#3a3f4b'),
    rect(PC.x + 31, 552, 46, 8, '#3a3f4b', 'rx="3"'),
    rect(PC.x - 5, PC.y - 5, PC.w + 10, PC.h + 10, '#1b1e26', 'rx="6"'),
    // Keyboard and mug.
    rect(1332, 552, 62, 8, '#2d3039', 'rx="2.5"'),
    `<path d="M1336 555h54" stroke="#6ecbff" stroke-width="1.5" stroke-dasharray="4 2" opacity=".8"/>`,
    rect(MUG_X, 542, 16, 18, '#f4eee2', 'rx="3"'),
    `<path d="M${MUG_X + 16} 546q8 1 0 9" stroke="#f4eee2" stroke-width="3" fill="none"/>`,
    // The desk lamp: its foot and arm. Its head is drawn above the wash.
    rect(1212, 554, 30, 6, '#3a3f4b', 'rx="3"'),
    `<path d="M1227 554l-8-44 22-22" stroke="#3a3f4b" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  ].join('')
}

const MUG_X = 1442

// The desk lamp's head, bent over the desk, and its light when it is on.
function deskLamp(isOn, isDark) {
  return [
    isOn && isDark ? `<circle cx="1262" cy="520" r="150" fill="url(#lampGlow)"/>` : '',
    `<g transform="translate(1241,488) rotate(-38)"><path d="M-16 4h32l-7-18h-18Z" fill="#d97757"/><ellipse cx="0" cy="4" rx="13" ry="3.5" fill="${isOn ? '#fff3c9' : '#8f6843'}"/></g>`,
  ].join('')
}

function chair() {
  return [
    rect(1196, 536, 11, 68, '#3a3f4b', 'rx="5.5"'),
    rect(1200, 598, 76, 11, '#454b59', 'rx="5.5"'),
    rect(1235, 609, 6, 46, '#2d3039'),
    `<path d="M1210 668l28-14 28 14" stroke="#2d3039" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="1210" cy="670" r="5" fill="#15171c"/><circle cx="1266" cy="670" r="5" fill="#15171c"/><circle cx="1238" cy="672" r="5" fill="#15171c"/>`,
  ].join('')
}

// What the two screens show. Drawn above the wash, since screens glow.
function screens(mode, kind) {
  const { x, y, w, h } = PC
  const out = []

  if (mode === 'off') {
    return rect(x, y, w, h, '#0c0e13', 'rx="3"')
  }
  // At work the screen shows the tool in hand; with none, or an edit, code
  // being typed (below).
  if (mode === 'work' && kind === 'read') {
    const r = rng(11)

    // A page of text, and a bar that reads down it.
    out.push(rect(x, y, w, h, '#232a3a', 'rx="3"'))
    for (let i = 0; i < 7; i++) out.push(rect(x + 8, y + 8 + i * 8.5, n(40 + r() * 52), 4, i === 0 ? '#e8dfd0' : '#8d97ad', 'rx="2"'))
    out.push(`<g style="animation:scan 3.2s ease-in-out infinite">${rect(x + 4, y + 5.5, w - 8, 9, '#ffd166', 'rx="2" opacity=".3"')}</g>`)

    return out.join('')
  }
  if (mode === 'work' && kind === 'shell') {
    // A terminal: prompts, what they printed, and a cursor that waits.
    out.push(rect(x, y, w, h, '#0b0d10', 'rx="3"'))
    for (const [i, len, isPrompt] of [[0, 34, true], [1, 62, false], [2, 48, false], [3, 26, true], [4, 70, false], [5, 0, true]]) {
      const top = y + 9 + i * 9.5

      if (isPrompt) out.push(`<path d="M${x + 8} ${top}l3 2.5-3 2.5" stroke="#7ae582" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)
      if (len > 0) out.push(rect(x + (isPrompt ? 16 : 8), top + 0.5, len, 4, isPrompt ? '#e8dfd0' : '#5b6478', 'rx="2"'))
    }
    out.push(`<rect x="${x + 16}" y="${n(y + 9 + 5 * 9.5 - 1)}" width="5" height="7" fill="#7ae582" style="animation:tw 1s steps(1) infinite"/>`)

    return out.join('')
  }
  if (mode === 'work' && kind === 'web') {
    // A browser: the address bar, a page loading under it.
    return [
      rect(x, y, w, h, '#e9edf3', 'rx="3"'),
      rect(x, y, w, 13, '#c9d1e3', 'rx="3"'),
      `<circle cx="${x + 7}" cy="${y + 6.5}" r="2" fill="#ff5d73"/><circle cx="${x + 14}" cy="${y + 6.5}" r="2" fill="#ffd166"/>`,
      rect(x + 22, y + 3, w - 30, 7, '#f7f9fc', 'rx="3.5"'),
      `<rect class="l" x="${x}" y="${y + 13}" width="${w}" height="2.5" fill="#4a90e2" style="animation:type 2.6s steps(9) infinite"/>`,
      `<circle cx="${x + 22}" cy="${y + 38}" r="12" fill="#6ecbff"/><path d="M${x + 10} ${y + 38}h24M${x + 22} ${y + 26}v24M${x + 22} ${y + 26}q-9 12 0 24M${x + 22} ${y + 26}q9 12 0 24" stroke="#2f6fa8" stroke-width="1.2" fill="none"/>`,
      rect(x + 42, y + 24, 54, 5, '#5b6478', 'rx="2.5"'),
      rect(x + 42, y + 34, 44, 4, '#9aa3b5', 'rx="2"'),
      rect(x + 42, y + 42, 50, 4, '#9aa3b5', 'rx="2"'),
      rect(x + 42, y + 50, 30, 4, '#9aa3b5', 'rx="2"'),
    ].join('')
  }
  if (mode === 'work') {
    const r = rng(5)
    const colors = ['#d97757', '#6ecbff', '#7ae582', '#c9a0ff', '#e8dfd0', '#ffd166']
    out.push(rect(x, y, w, h, '#1d2433', 'rx="3"'))
    for (let i = 0; i < 7; i++) {
      const indent = Math.floor(r() * 3) * 8
      const len = 22 + r() * 56
      out.push(
        `<rect class="l" x="${x + 8 + indent}" y="${y + 8 + i * 8.5}" width="${n(Math.min(len, w - 18 - indent))}" height="4" rx="2" fill="${colors[i % colors.length]}" style="animation:type 5s ${n(i * 0.45)}s steps(9) infinite"/>`,
      )
    }

    return out.join('')
  }
  if (mode === 'fail') {
    return [
      rect(x, y, w, h, '#3a1216', 'rx="3"'),
      `<g stroke="#ff5d73" stroke-width="7" stroke-linecap="round" style="animation:pulse 1s infinite"><path d="M${x + 36} ${y + 17}l36 36M${x + 72} ${y + 17}l-36 36"/></g>`,
    ].join('')
  }
  if (mode === 'pass') {
    return [
      rect(x, y, w, h, '#10301f', 'rx="3"'),
      `<g stroke="#7ae582" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"><path class="c" style="animation:pop .5s" d="M${x + 34} ${y + 37}l14 14 26-32"/></g>`,
    ].join('')
  }

  // Idle: a screensaver.
  return [
    rect(x, y, w, h, '#161b27', 'rx="3"'),
    `<g><g style="animation:saver 14s linear infinite"><rect x="${x + 4}" y="${y + 4}" width="22" height="16" rx="3" fill="#d97757"/></g></g>`,
  ].join('')
}

// ---------------------------------------------------------------- mascot

const ORANGE = '#d97757'
const ORANGE_DARK = '#c2623f'
const INK = '#2b1d16'

// The critter, feet at (0, 0): a boxy orange body about 72 wide and 62 tall.
function critter({ eyes = 'open', look = [0, 0], arms = 'down' }) {
  const [dx, dy] = look
  const eyeX = [-17 + dx, 10 + dx]
  const out = []

  // Legs.
  for (const x of [-29, -13, 5, 21]) {
    out.push(rect(x, -14, 8, 14, ORANGE_DARK, 'rx="2"'))
  }
  // Back arm.
  if (arms === 'up') {
    out.push(
      `<g class="f" style="animation:sway .5s infinite">${rect(-50, -78, 12, 26, ORANGE, 'rx="4" transform="rotate(-22 -44 -52)"')}</g>`,
      `<g class="f" style="animation:sway .5s -.25s infinite">${rect(38, -78, 12, 26, ORANGE, 'rx="4" transform="rotate(22 44 -52)"')}</g>`,
    )
  } else {
    out.push(rect(-47, -42, 14, 11, ORANGE, 'rx="3"'))
    if (arms === 'down' || arms === 'face') out.push(rect(33, -42, 14, 11, ORANGE, 'rx="3"'))
  }
  out.push(rect(-36, -62, 72, 52, ORANGE, 'rx="9"'))
  out.push(rect(-36, -22, 72, 12, ORANGE_DARK, 'rx="6" opacity=".35"'))

  if (eyes === 'open' || eyes === 'wide') {
    const tall = eyes === 'wide' ? 18 : 13
    for (const x of eyeX) {
      out.push(
        `<rect class="c" x="${x}" y="${-37 - tall + dy}" width="${eyes === 'wide' ? 8 : 7}" height="${tall}" rx="2.5" fill="${INK}" style="animation:blink 5.5s infinite"/>`,
      )
    }
  } else if (eyes === 'half') {
    for (const x of eyeX) out.push(rect(x, -44 + dy, 7, 6, INK, 'rx="2"'))
    out.push(rect(-22 + dx, -51 + dy, 46, 7, ORANGE_DARK, 'rx="3" opacity=".55"'))
  } else if (eyes === 'closed') {
    for (const x of eyeX) {
      out.push(
        `<path d="M${x - 1} ${-43 + dy}q4.5 5 9 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
      )
    }
  } else if (eyes === 'happy') {
    for (const x of eyeX) {
      out.push(
        `<path d="M${x - 1} ${-40 + dy}q4.5-9 9 0" stroke="${INK}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
      )
    }
  }

  // Front arm and what it holds.
  if (arms === 'tapping') {
    out.push(
      `<g style="animation:tap .26s infinite">${rect(30, -40, 22, 10, ORANGE, 'rx="4"')}</g>`,
      `<g style="animation:tap .26s -.13s infinite">${rect(26, -30, 22, 10, ORANGE_DARK, 'rx="4"')}</g>`,
    )
  } else if (arms === 'phone') {
    out.push(
      `<circle cx="48" cy="-42" r="26" fill="#9fd0ff" opacity=".2" style="animation:pulse 2.2s infinite"/>`,
      rect(41, -56, 14, 24, '#20242c', 'rx="2.5" transform="rotate(8 48 -44)"'),
      rect(43, -53, 10, 18, '#9fd0ff', 'rx="1.5" transform="rotate(8 48 -44)"'),
      `<g style="animation:tap .8s infinite">${rect(30, -38, 16, 10, ORANGE, 'rx="4"')}</g>`,
    )
  } else if (arms === 'face') {
    out.push(rect(-24, -52, 50, 15, ORANGE_DARK, 'rx="6"'))
  } else if (arms === 'stick') {
    out.push(
      rect(33, -48, 16, 10, ORANGE, 'rx="4" transform="rotate(-30 36 -43)"'),
      `<line x1="44" y1="-48" x2="84" y2="-108" stroke="#8a6a4a" stroke-width="3.5" stroke-linecap="round"/>`,
      `<g transform="translate(84,-108)"><g class="t" style="animation:sway 1.1s ease-in-out infinite"><line x1="0" y1="0" x2="0" y2="56" stroke="#e8dfd0" stroke-width="1.6"/><circle cx="0" cy="62" r="9" fill="#e85d75"/><path d="M-6 58q6 6 12 0M-5 66q5-5 10 0" stroke="#b83d55" stroke-width="1.4" fill="none"/></g></g>`,
    )
  }

  return out.join('')
}

function zees(x, y, color = '#fff', seconds = 3) {
  return [0, 1, 2]
    .map(
      i =>
        `<text x="${x}" y="${y}" font-size="${16 + i * 3}" fill="${color}" opacity="0" class="c" style="animation:zz ${seconds}s ${n((i * seconds) / 3)}s infinite">z</text>`,
    )
    .join('')
}

function thought() {
  return `<g opacity=".95"><circle cx="34" cy="-74" r="3.5" fill="#fff"/><circle cx="42" cy="-86" r="5.5" fill="#fff"/><ellipse cx="66" cy="-112" rx="27" ry="20" fill="#fff"/><g transform="translate(66,-112)"><g class="c" style="animation:flip 2.6s infinite"><path d="M-8-11h16l-8 11 8 11h-16l8-11Z" fill="#d97757" stroke="#2b1d16" stroke-width="1.6" stroke-linejoin="round"/></g></g></g>`
}

// Which side of the chat a spot is on. Each side is a class, so the
// stylesheet can pull both inward when a narrow window crops the canvas.
const side = x => (x < W / 2 ? 'zl' : 'zr')

// Spreads 0..1 over the two side strips, skipping the middle.
const sideX = u => (u < 0.5 ? u * 2 * 350 : 1240 + (u - 0.5) * 2 * 350)

// Where the mascot is and how it holds itself, for each pose.
function mascot(room) {
  const pose = room.mascot
  const at = (x, y, turn, inner, extra = '', motion = 'breathe 3.8s ease-in-out infinite') =>
    `<g class="${side(x)}"><g transform="translate(${x},${y})${turn ? ` rotate(${turn})` : ''}"><g class="f" style="animation:${motion}">${inner}</g>${extra}${room.isWaiting && pose !== 'work' ? thought() : ''}</g></g>`

  switch (pose) {
    case 'phone':
      return at(172, 622 + DROP, 0, critter({ look: [5, 4], arms: 'phone' }))
    case 'scroll': {
      const hearts = [0, 1, 2]
        .map(
          i =>
            `<path class="c" d="M52-66c-4-7-13-1-7 5l7 6 7-6c6-6-3-12-7-5Z" fill="#ff6b8a" opacity="0" style="animation:zz 2.4s ${n(i * 0.8)}s infinite"/>`,
        )
        .join('')

      return at(
        208,
        620 + DROP,
        -16,
        critter({ eyes: 'half', look: [6, 2], arms: 'phone' }),
        hearts,
        'breathe 5s ease-in-out infinite',
      )
    }
    case 'nap':
      return at(
        208,
        622 + DROP,
        -7,
        critter({ eyes: 'closed', look: [0, 2] }),
        zees(30, -66),
        'breathe 4.6s ease-in-out infinite',
      )
    case 'sleep':
      return at(
        208,
        622 + DROP,
        -7,
        critter({ eyes: 'closed', look: [0, 2] }) +
          `<path d="M-26-60h44l18-24Z" fill="#6b7fd1"/><circle cx="36" cy="-85" r="6" fill="#fff"/>` +
          rect(-44, -36, 90, 38, '#6b7fd1', 'rx="10"') +
          `<path d="M-44-22h90M-44-10h90" stroke="#8d9ce0" stroke-width="4"/>`,
        zees(34, -84, '#cfd8ff', 4.5),
        'breathe 5.5s ease-in-out infinite',
      )
    case 'notice':
      return at(
        172,
        622 + DROP,
        0,
        critter({ eyes: 'wide', look: [6, -2] }),
        `<g transform="translate(0,-74)"><g class="f" style="animation:pop .4s"><rect x="-4" y="-26" width="8" height="18" rx="3" fill="#ffcc33"/><circle cx="0" cy="-2" r="4.5" fill="#ffcc33"/></g></g>`,
        'hop .8s ease-out 2',
      )
    case 'window':
      return at(110, SILL, 0, critter({ look: [7, -5] }), '', 'breathe 4.4s ease-in-out infinite')
    case 'work': {
      // By the tool in hand: typing for an edit (or none), reading with its
      // eyes up, leaning back while a command runs, clicking through a page.
      const kind = room.doing?.kind
      const spot = [1350, 600 + DESK_DROP]

      if (kind === 'read') return at(...spot, 0, critter({ look: [8, -3] }), '', 'breathe 3s ease-in-out infinite')
      if (kind === 'shell') return at(...spot, -5, critter({ eyes: 'half', look: [7, 0] }), '', 'breathe 4.2s ease-in-out infinite')
      if (kind === 'web') return at(...spot, 0, critter({ look: [9, 0], arms: 'tapping' }), '', 'breathe 2.4s ease-in-out infinite')

      return at(...spot, 0, critter({ look: [8, 2], arms: 'tapping' }), '', 'bob .52s infinite')
    }
    case 'facepalm':
      return at(
        1350,
        600 + DESK_DROP,
        0,
        critter({ eyes: 'none', arms: 'face' }),
        `<path class="c" d="M34-70q-7 11 0 14q7-3 0-14Z" fill="#6ecbff" style="animation:steam 1.8s infinite"/>`,
        'shake .5s 3',
      )
    case 'play':
      return at(168, 748 + DROP, 0, critter({ eyes: 'happy', look: [5, 0], arms: 'stick' }))
    case 'cheer':
      return at(
        200,
        748 + DROP,
        0,
        critter({ eyes: 'happy', arms: 'up' }) +
          `<path d="M-14-62l14-30 14 30Z" fill="#ffcc33"/><path d="M-9-72h18M-5-80h10" stroke="#e85d75" stroke-width="3"/><circle cx="0" cy="-93" r="4.5" fill="#e85d75"/>`,
        '',
        'jump .62s ease-in-out infinite',
      )
    default:
      return at(172, 622 + DROP, 0, critter({}))
  }
}

// ---------------------------------------------------------------- kitten

const FUR = '#8791a6'
const FUR_DARK = '#69728a'
const CREAM = '#f4eee2'

function catHead(x, y, { eyes = 'open', isBack = false } = {}) {
  const out = [
    `<path d="M${x - 9} ${y - 5}l1-12 8 6ZM${x + 9} ${y - 5}l-1-12-8 6Z" fill="${FUR_DARK}"/>`,
    `<circle cx="${x}" cy="${y}" r="10.5" fill="${FUR}"/>`,
  ]

  if (isBack) return out.join('')
  if (eyes === 'open') {
    out.push(
      `<g class="c" style="animation:blink 4.2s infinite"><circle cx="${x - 4}" cy="${y - 1}" r="1.8" fill="#20242c"/><circle cx="${x + 4}" cy="${y - 1}" r="1.8" fill="#20242c"/></g>`,
    )
  } else if (eyes === 'wide') {
    out.push(
      `<circle cx="${x - 4}" cy="${y - 1}" r="3.4" fill="#fff"/><circle cx="${x + 4}" cy="${y - 1}" r="3.4" fill="#fff"/><circle cx="${x - 4}" cy="${y - 1}" r="1.4" fill="#20242c"/><circle cx="${x + 4}" cy="${y - 1}" r="1.4" fill="#20242c"/>`,
    )
  } else {
    out.push(
      `<path d="M${x - 6} ${y - 1}q2 2 4 0M${x + 2} ${y - 1}q2 2 4 0" stroke="#20242c" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
    )
  }
  out.push(
    `<path d="M${x - 1.5} ${y + 3}h3l-1.5 2Z" fill="#f2a7a7"/><path d="M${x - 14} ${y + 2}l7 1M${x + 14} ${y + 2}l-7 1" stroke="#fff" stroke-width=".8" opacity=".7"/>`,
  )

  return out.join('')
}

// Standing, facing right, feet at (0, 0).
function catStanding({ isWalking = false, isSwiping = false } = {}) {
  const leg = (x, delay, isFront) =>
    `<g ${isWalking || (isSwiping && isFront) ? `style="animation:step ${isSwiping ? 0.35 : 0.4}s ${delay}s infinite"` : ''}>${rect(x, -9, 5, 9, isFront ? CREAM : FUR_DARK, 'rx="2"')}</g>`

  return [
    `<path class="c" d="M-18-17q-14-2-12-22" stroke="${FUR}" stroke-width="5" fill="none" stroke-linecap="round" style="transform-origin:100% 100%;animation:sway 1.5s infinite"/>`,
    leg(-15, 0, false),
    leg(-7, -0.2, false),
    leg(6, -0.1, false),
    leg(13, -0.3, true),
    `<ellipse cx="0" cy="-16" rx="20" ry="10" fill="${FUR}"/><ellipse cx="13" cy="-13" rx="6" ry="6" fill="${CREAM}"/>`,
    catHead(20, -28),
  ].join('')
}

// Sitting upright, feet at (0, 0).
function catSitting({ eyes = 'open', isBack = false, isSpiky = false } = {}) {
  const tail = isBack
    ? `<path class="t" d="M2-3q6 16-3 30" stroke="${FUR}" stroke-width="5" fill="none" stroke-linecap="round" style="animation:sway 2.6s ease-in-out infinite"/>`
    : `<path d="M-9-3q-16 2-14-13" stroke="${FUR}" stroke-width="5" fill="none" stroke-linecap="round"/>`
  const spikes = isSpiky
    ? `<path d="M-17-30l6 4-2-9 7 5 1-9 5 7 4-8 2 9 7-4-3 9 7 0-6 6 6 5-8 1 3 8-8-3-1 8-6-6-5 6-2-8-7 3 3-8-8-2 6-5Z" fill="${FUR_DARK}" transform="translate(1,4) scale(1.25)"/>`
    : ''

  return [
    tail,
    spikes,
    `<ellipse cx="0" cy="-15" rx="12.5" ry="15" fill="${FUR}"/>`,
    isBack ? '' : `<ellipse cx="0" cy="-16" rx="5.5" ry="9" fill="${CREAM}"/>${rect(-8, -5, 6, 5, CREAM, 'rx="2"')}${rect(2, -5, 6, 5, CREAM, 'rx="2"')}`,
    `<g class="f" ${eyes === 'open' && !isBack ? 'style="animation:tilt 3.4s ease-in-out infinite"' : ''}>${catHead(0, -36, { eyes, isBack })}</g>`,
  ].join('')
}

// A loaf (awake) or a curl (asleep), resting on (0, 0).
function catLoaf(isAsleep) {
  return [
    isAsleep
      ? `<path d="M-18-6q-8 8 8 7t22-2" stroke="${FUR_DARK}" stroke-width="5" fill="none" stroke-linecap="round"/>`
      : `<path class="c" d="M-18-8q-12 0-12-14" stroke="${FUR}" stroke-width="5" fill="none" stroke-linecap="round" style="transform-origin:100% 100%;animation:sway 2.2s infinite"/>`,
    `<g class="f" style="animation:breathe ${isAsleep ? 4.2 : 3.2}s ease-in-out infinite"><ellipse cx="0" cy="-10" rx="21" ry="11" fill="${FUR}"/></g>`,
    catHead(isAsleep ? 12 : 15, isAsleep ? -10 : -20, { eyes: isAsleep ? 'closed' : 'open' }),
  ].join('')
}

function kitten(room) {
  const pose = room.kitten
  const at = (x, y, inner, { turn = 0, motion = '', extra = '' } = {}) =>
    `<g class="${side(x)}"><g transform="translate(${x},${y})${turn ? ` rotate(${turn})` : ''}"><g class="f" ${motion ? `style="animation:${motion}"` : ''}>${inner}</g>${extra}</g></g>`

  switch (pose) {
    case 'loaf':
      return at(329, 592 + DROP, catLoaf(false))
    case 'sleep':
      return at(BED_X, 756 + DROP, catLoaf(true), { extra: zees(22, -24, '#fff', 3.6).replace(/font-size="(\d+)"/g, (_, s) => `font-size="${s - 6}"`) })
    case 'sill':
      return at(290, SILL, catSitting({ isBack: true }))
    case 'desk':
      return at(1532, 560 + DESK_DROP, catSitting({}))
    case 'startle':
      return at(290, SILL, catSitting({ eyes: 'wide', isSpiky: true }), { motion: 'hop .45s infinite' })
    case 'yarn':
      return at(168, 806 + DROP, catStanding({ isSwiping: true }), {
        extra: `<g transform="translate(34,-9)"><g class="c" style="animation:roll 1.4s ease-in-out infinite"><circle r="9" fill="#e85d75"/><path d="M-6-3q6 6 12 0M-5 4q5-5 10 0" stroke="#b83d55" stroke-width="1.4" fill="none"/></g></g><path d="M40 0q30 6 60-4" stroke="#e85d75" stroke-width="1.6" fill="none"/>`,
      })
    case 'pounce':
      return at(228, 752 + DROP, catStanding({ isSwiping: true }), { turn: -30, motion: 'hop .7s infinite' })
    case 'prowl':
      // The turn is about the feet (the group's own origin), not `.c`: the
      // middle of the box moves with the tail and the legs, and a turn about
      // it made the walk back lurch.
      return `<g class="zl"><g transform="translate(156,${782 + DROP})"><g style="animation:walk 16s linear infinite"><g style="animation:face 16s steps(1) infinite">${catStanding({ isWalking: true })}</g></g></g></g>`
    default:
      return at(329, 592 + DROP, catLoaf(false))
  }
}

// -------------------------------------------------------------------- fx

function confetti() {
  const r = rng(99)
  const colors = ['#ff5d73', '#ffd166', '#7ae582', '#6ecbff', '#c9a0ff', '#d97757']
  const out = []

  for (let i = 0; i < 70; i++) {
    const seconds = 2.6 + r() * 2.6
    out.push(
      `<g transform="translate(${n(sideX(r()))},0)"><rect class="c" width="${n(6 + r() * 6)}" height="${n(10 + r() * 8)}" rx="1.5" fill="${colors[i % colors.length]}" style="animation:fall ${n(seconds)}s ${n(-r() * seconds)}s linear infinite"/></g>`,
    )
  }

  return out.join('')
}

// ----------------------------------------------------------------- whole

// Moves every inline style="..." into a class in the <style> block. The app
// draws the scene in a sandboxed frame that keeps the stylesheet; animations
// named in style attributes did not run there.
// ---------------------------------------------------------------- the TV
// A wall TV over the desk that shows the session's figures: `look.tv`, a
// Screen. Left out, there is no TV and the poster hangs there. Like the
// clock, its case goes under the wash and its picture over it. It is drawn
// 240 x 164 and set larger by `s`, which is what makes its text readable.

const TV = { x: 1232, y: 106, w: 240, h: 164, s: 1.45 }
const TV_AT = `translate(${TV.x},${TV.y}) scale(${TV.s})`
const SCREEN_AT = `translate(${n(TV.x + 7 * TV.s)},${n(TV.y + 7 * TV.s)}) scale(${TV.s})`
const SCREEN = { w: TV.w - 14, h: TV.h - 22 }

// Names come from the session, so they are escaped and cut to fit.
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
const fit = (s, max) => {
  const chars = [...String(s ?? '')]

  return esc(chars.length > max ? chars.slice(0, max - 1).join('') + '…' : chars.join(''))
}
const tokens = t => (t >= 1e6 ? n(t / 1e6) + 'M' : t >= 1000 ? Math.round(t / 1000) + 'k' : String(t))
// Green, then yellow past half, then red past four fifths.
const heat = p => (p > 80 ? '#ff5d6c' : p > 50 ? '#ffd23f' : '#7ae582')

function tvCase() {
  return `<g transform="${TV_AT}">${[
    rect(0, 0, TV.w, TV.h, '#23262f', 'rx="8"'),
    rect(7, 7, SCREEN.w, SCREEN.h, '#0c0f16', 'rx="3"'),
    rect(TV.w / 2 - 14, TV.h - 10, 28, 3, '#3a3f4c', 'rx="1.5"'),
  ].join('')}</g>`
}

// One ring of the quota dial: a dim track, and an arc as a dash of the same
// circle. Static: nothing here animates, so nothing here can still the room.
function ring(r, percent) {
  const around = 2 * Math.PI * r
  const p = Math.min(100, Math.max(0, percent ?? 0))
  const arc =
    percent == null || p <= 0
      ? ''
      : `<circle r="${r}" fill="none" stroke="${heat(p)}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${n((around * p) / 100)} ${n(around)}" transform="rotate(-90)"/>`

  return `<circle r="${r}" fill="none" stroke="#9aa3b5" stroke-width="7" opacity=".18"/>${arc}`
}

// One of the two names on the TV. One that fits stands still. A longer one
// pans to its end and back under a clip, by a keyframe written for its own
// length (translate only, as the rest are): `css` goes in the style block.
// The width is a guess at a monospace face, 0.62 of the size a character (0.61 measured).
const WIDE = 0.62

function nameLine(id, text, { x, y, size, room, fill }) {
  const chars = [...String(text ?? '')].slice(0, 80)
  const over = Math.ceil(chars.length * size * WIDE - room)
  const label = esc(chars.join(''))

  if (over <= 0) {
    return { svg: `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}">${label}</text>`, css: '' }
  }
  const seconds = n(8 + over / 14)

  return {
    svg: `<clipPath id="${id}"><rect x="${x}" y="${n(y - size)}" width="${room}" height="${n(size * 1.4)}"/></clipPath><g clip-path="url(#${id})"><text x="${x}" y="${y}" font-size="${size}" fill="${fill}" style="animation:${id} ${seconds}s linear infinite">${label}</text></g>`,
    css: `@keyframes ${id}{0%,20%{transform:translateX(0px)}50%,70%{transform:translateX(-${over + 4}px)}100%{transform:translateX(0px)}}`,
  }
}

// The chat's name over the project's. A greeting stands in for one that is
// not known yet.
// The mark for a pull request, a disc 9 across with its top left at x, y:
// the colour says how it stands and the sign inside says why.
function prMark(state, x, y) {
  const at = `<g transform="translate(${n(x + 4.5)},${n(y + 4.5)})">`
  const disc = fill => `<circle r="4.5" fill="${fill}"/>`
  const ring = (stroke, extra = '') => `<circle r="3.8" fill="none" stroke="${stroke}" stroke-width="1.4"${extra}/>`
  const sign = d => `<path d="${d}" stroke="#0c0f16" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  const marks = {
    draft: ring('#9aa3b5', ' stroke-dasharray="2 1.6"'),
    open: ring('#7ae582'),
    pending: disc('#ffd23f') + `<circle r="1.5" fill="#0c0f16" style="animation:pulse 1.6s infinite"/>`,
    failing: disc('#ff5d6c') + sign('M-1.8-1.8l3.6 3.6M1.8-1.8l-3.6 3.6'),
    passing: disc('#7ae582') + sign('M-2.2 0l1.6 1.7 2.8-3.2'),
    changes: disc('#ffb347') + sign('M0-2.4v2.6M0 2.3v.1'),
    merged: disc('#b48cff') + sign('M-1.6-2.2v4.4M-1.6 0q3.4 0 3.4-2.2'),
    closed: ring('#ff5d6c') + `<path d="M-2.6 2.6l5.2-5.2" stroke="#ff5d6c" stroke-width="1.4" stroke-linecap="round"/>`,
  }

  return marks[state] ? `${at}${marks[state]}</g>` : ''
}

const count = v => (v >= 1000 ? n(v / 1000) + 'k' : String(v))

// The pull request's card, on a line of its own under the branch, its text
// on the baseline y: a rounded label for how the request stands, as GitHub
// draws one, and beside it the checks or the review where there is news.
const PR_LABEL = { draft: ['Draft', '#6e7681'], merged: ['Merged', '#8957e5'], closed: ['Closed', '#da3633'] }
const PR_NOTE = {
  pending: ['checks running', '#ffd23f'],
  failing: ['checks failing', '#ff5d6c'],
  passing: ['checks passed', '#7ae582'],
  changes: ['changes requested', '#ffb347'],
}

function prCard(state, y, number) {
  if (!PR_STATES.includes(state)) return ''
  const [word, fill] = PR_LABEL[state] ?? ['Open', '#238636']
  const label = Number.isInteger(number) && number > 0 ? `${word} #${number}` : word
  const width = 16 + Math.ceil(label.length * 4.6)
  let note = PR_NOTE[state]

  // A long number leaves the longest note no room: it is cut to its first word.
  if (note && 82 + width + 17 + note[0].length * WIDE * 7.5 > 234) note = [note[0].split(' ')[0], note[1]]

  return [
    rect(82, n(y - 8.3), width, 11, fill, 'rx="5.5"'),
    // The request's own sign: a branch that comes back to the trunk.
    `<g fill="none" stroke="#fff" stroke-width="1"><circle cx="86.6" cy="${n(y - 5.6)}" r="1.2"/><circle cx="86.6" cy="${n(y - 0.2)}" r="1.2"/><path d="M86.6 ${n(y - 4.4)}v3"/><circle cx="90.6" cy="${n(y - 0.2)}" r="1.2"/><path d="M90.6 ${n(y - 1.4)}v-2.4q0-1.8-1.9-1.8"/></g>`,
    `<text x="94" y="${n(y - 0.2)}" font-size="7.5" fill="#fff">${label}</text>`,
    note ? prMark(state, 82 + width + 5, y - 7.4) + `<text x="${82 + width + 17}" y="${n(y - 0.2)}" font-size="7.5" fill="${note[1]}">${note[0]}</text>` : '',
  ].join('')
}

const PR_STATES = ['draft', 'open', 'pending', 'failing', 'passing', 'changes', 'merged', 'closed']

// Under the project's, the branch, where the folder is in a repository, with
// what is not committed at the line's right end; under that, the pull
// request's card. With no request its line stays empty.
function tvNames(tv) {
  const hasBranch = Boolean(tv.project && tv.branch)
  const [a, b, c] = hasBranch ? [24, 36.5, 52] : [31, 47, 0]
  const top = nameLine('pana', tv.chat ?? tv.greeting ?? 'new chat', { x: 82, y: a, size: 12, room: 140, fill: '#f4eee2' })
  const sub = tv.project
    ? nameLine('panb', tv.project, { x: 95, y: b, size: 8.5, room: 127, fill: '#9aa3b5' })
    : nameLine('panb', tv.chat ? (tv.greeting ?? '') : '', { x: 82, y: b, size: 8.5, room: 140, fill: '#9aa3b5' })
  const folder = tv.project ? `<path d="M82 ${b - 6.5}h3.6l1.4 1.5h5v6h-10Z" fill="#e9b44c"/>` : ''
  // What is not committed stands right after the branch's name. A name too
  // long for the room left of it pans, and the figure keeps the line's end.
  let aside = hasBranch ? prCard(tv.pr, 66.5, tv.prNumber) : ''
  let room = 222 - 95

  if (hasBranch && tv.diff) {
    const added = `+${count(tv.diff.added)}`
    const removed = `-${count(tv.diff.removed)}`
    const wide = WIDE * 9.5

    room -= Math.ceil((added.length + removed.length + 1) * WIDE * 8.5) + 7
    const x = 95 + Math.min(room, Math.ceil([...String(tv.branch)].length * wide)) + 7

    aside += `<text x="${x}" y="${c}" font-size="8.5"><tspan fill="#7ae582">${added}</tspan><tspan fill="#5b6478">/</tspan><tspan fill="#ff5d6c">${removed}</tspan></text>`
  }
  const twig = hasBranch ? nameLine('panc', tv.branch, { x: 95, y: c, size: 9.5, room, fill: '#8fd3a8' }) : { svg: '', css: '' }
  // The branch mark: a trunk between two dots, and a third dot joined to it.
  const mark = hasBranch
    ? `<g fill="none" stroke="#8fd3a8" stroke-width="1.2"><circle cx="84.6" cy="${c - 7.6}" r="1.6"/><circle cx="84.6" cy="${c - 0.4}" r="1.6"/><circle cx="90.6" cy="${c - 6}" r="1.6"/><path d="M84.6 ${c - 6}v4M90.6 ${c - 4.4}q0 2.8-4.4 3"/></g>`
    : ''

  return { svg: top.svg + folder + sub.svg + mark + twig.svg + aside, css: top.css + sub.css + twig.css }
}

// The picture, drawn over the wash so it glows at night as the screens do.
function tvFace(tv, doing) {
  const pct = v => (v == null ? '--' : Math.round(v) + '%')
  const quota = (y, label, limit) =>
    `<text x="82" y="${y}" font-size="8.5" fill="${limit ? heat(limit.percent) : '#5b6478'}">${label} ${pct(limit?.percent)}${limit?.resets ? `<tspan fill="#5b6478"> · resets ${fit(limit.resets, 9)}</tspan>` : ''}</text>`
  const ctx = tv.context
  const used = ctx?.percent == null ? 0 : Math.min(100, Math.max(0, ctx.percent))
  // The tool in hand leads the ticker, and must be read at once: with it the
  // line never slides, and keeps only as much of the rest as fits.
  const items = [...(doing?.label ? [doing.label] : []), ...(tv.feed ?? [])]
  const kept = doing?.label ? items.filter((_, i) => items.slice(0, i + 1).join('  ·  ').length <= 44) : items
  const feed = kept.map(item => fit(item, 28)).join('  ·  ')
  // A line that fits stands still; a longer one slides by.
  const isSliding = feed.length > 44

  return [
    `<g transform="${SCREEN_AT}"><clipPath id="tvClip"><rect width="${SCREEN.w}" height="${SCREEN.h}" rx="3"/></clipPath><g clip-path="url(#tvClip)">`,
    // The dial: the week outside, five hours inside.
    `<g transform="translate(40,66)">${ring(30, tv.week?.percent)}${ring(20, tv.fiveHour?.percent)}<text y="4" font-size="10" text-anchor="middle" fill="${tv.fiveHour ? heat(tv.fiveHour.percent) : '#5b6478'}">${tv.fiveHour ? Math.round(tv.fiveHour.percent) : '--'}</text></g>`,
    tvNames(tv).svg,
    quota(81, '5H', tv.fiveHour),
    quota(93, 'WK', tv.week),
    // The context window.
    `<text x="82" y="108" font-size="8.5" fill="${ctx?.percent == null ? '#5b6478' : heat(used)}">CTX ${pct(ctx?.percent)}<tspan fill="#5b6478">${ctx?.tokens == null ? '' : ` · ${tokens(ctx.tokens)} / ${tokens(ctx.window)}`}</tspan></text>`,
    rect(82, 112, 136, 5, '#9aa3b5', 'rx="2.5" opacity=".18"'),
    used > 0 ? rect(82, 112, n((136 * used) / 100), 5, heat(used), 'rx="2.5"') : '',
    // The ticker.
    rect(0, SCREEN.h - 16, SCREEN.w, 16, '#161a24'),
    isSliding
      ? `<text y="${SCREEN.h - 5}" font-size="8" fill="#c9d1e3" style="animation:tick 30s -6s linear infinite">${feed}</text>`
      : `<text x="8" y="${SCREEN.h - 5}" font-size="8" fill="#c9d1e3">${feed}</text>`,
    '</g></g>',
  ].join('')
}

// Every redraw is a new document, whose animations start over. So each loop
// is told how far into its turn it is by the clock (`at`, seconds since
// midnight), as a negative delay: drawn again, it goes on from where it was.
// The clock's own glyphs already carry theirs.
function phased(declarations, at) {
  return declarations.replace(
    /animation:([a-z]+) (\d*\.?\d+)s(?: (-?\d*\.?\d+)s)?([^;]*\binfinite)/,
    (all, name, seconds, delay, rest) => {
      const turn = Number(seconds)

      if (name.startsWith('clk') || !(turn > 0)) return all
      const into = (((at - Number(delay ?? 0)) % turn) + turn) % turn

      return `animation:${name} ${seconds}s ${Math.round(-into * 100) / 100}s${rest}`
    },
  )
}

function hoist(svg, at) {
  const rules = new Map()
  const out = svg.replace(
    /<([a-z]+)((?:\s[^<>]*?)?)\sstyle="([^"]*)"([^<>]*)>/g,
    (_, tag, before, written, after) => {
      const declarations = phased(written, at)
      let name = rules.get(declarations)

      if (name === undefined) {
        name = 's' + rules.size
        rules.set(declarations, name)
      }
      let attributes = before + after

      attributes = /\sclass="/.test(attributes)
        ? attributes.replace(/\sclass="([^"]*)"/, (__, held) => ` class="${held} ${name}"`)
        : ` class="${name}"` + attributes

      return `<${tag}${attributes}>`
    },
  )
  const css = [...rules].map(([declarations, name]) => `.${name}{${declarations}}`).join('')

  return out.replace('</style>', css + '</style>')
}

// Every colour in a piece of the drawing, darkened: what a brightness filter
// would do, worked out here because a filter stills the scene in the app.
function shaded(svg, k) {
  if (k >= 1) return svg

  return svg.replace(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi, (_, hex) => {
    const full = hex.length === 3 ? [...hex].map(c => c + c).join('') : hex

    return (
      '#' +
      [0, 2, 4]
        .map(i => Math.round(parseInt(full.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0'))
        .join('')
    )
  })
}

const OPEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">`

// How far the furniture and the cast on the floor sit below where they were
// first drawn. A wide window crops the top of the canvas, so the room keeps
// low and leaves the wall above for the window and the TV.
const DROP = 60
// The desk sits lower still, to leave the wall between it and the TV clear.
const DESK_DROP = 92
// The window, drawn at its own size and set small on the left wall, over the
// couch.
const WIN = { x: -195, y: 266, s: 0.48 }
// Where the cast stands at the window.
const SILL = WIN.y + 216
const WINDOW = `translate(${WIN.x},${WIN.y}) scale(${WIN.s})`
// The lamp and couch, drawn further right and larger, set small on the left.
const LOUNGE = `translate(-171,${149 + DROP}) scale(.78)`
// The desk, slid to the right wall.
const DESK = `translate(40,${DESK_DROP})`

// Where each pose stands, as its builder places it: a change of pose is
// drawn as a move from the old spot to the new one.
const MASCOT_SPOT = {
  phone: [172, 622 + DROP],
  scroll: [208, 620 + DROP],
  nap: [208, 622 + DROP],
  sleep: [208, 622 + DROP],
  notice: [172, 622 + DROP],
  window: [110, SILL],
  work: [1350, 600 + DESK_DROP],
  facepalm: [1350, 600 + DESK_DROP],
  play: [168, 748 + DROP],
  cheer: [200, 748 + DROP],
}
const KITTEN_SPOT = {
  loaf: [329, 592 + DROP],
  sleep: [BED_X, 756 + DROP],
  sill: [290, SILL],
  startle: [290, SILL],
  desk: [1532, 560 + DESK_DROP],
  yarn: [168, 806 + DROP],
  pounce: [228, 752 + DROP],
  prowl: [156, 782 + DROP],
}
const FADE = 0.3

// One of the cast, `since` seconds after it changed pose: the old pose fades
// where it stood while the new one comes from there, quicker at first. A
// redraw mid-way goes on from `since`; after the move, only the new pose.
// Each one-shot ends in the state the drawing has without it (the old pose
// carries opacity 0), so nothing needs a fill mode and a still surface shows
// the new pose alone. `id` names the keyframes: letters only.
function blend(id, drawn, old, from, to, since) {
  const [dx, dy] = [n(from[0] - to[0]), n(from[1] - to[1])]
  const far = Math.hypot(dx, dy)
  const seconds = n(0.4 + far / 2000)

  if (!(since >= 0 && since < seconds)) return { svg: drawn, css: '' }
  const delay = `${Math.round(-since * 100) / 100}s`
  const ghost = since < FADE ? `<g opacity="0" style="animation:gone ${FADE}s ${delay} linear">${old}</g>` : ''
  const shown = since < FADE ? `<g style="animation:show ${FADE}s ${delay} linear">${drawn}</g>` : drawn

  if (far === 0) return { svg: ghost + shown, css: '' }

  return {
    svg: `${ghost}<g style="animation:${id} ${seconds}s ${delay} ease-out">${shown}</g>`,
    // Held for a moment first: the app takes one to put a new drawing up.
    css: `@keyframes ${id}{0%,12%{transform:translate(${dx}px,${dy}px)}100%{transform:translate(0px,0px)}}`,
  }
}

// A helper for each subagent at work: a small critter on the floor in front
// of the desk, behind a laptop. They take the floor's right end, one by one.
const HELPER_X = [1490, 1556, 1424]

function helpers(count) {
  return HELPER_X.slice(0, Math.max(0, Math.min(HELPER_X.length, count | 0)))
    .map(
      (x, i) =>
        `<g class="zr"><g transform="translate(${x},856) scale(.65)"><g class="f" style="animation:bob .6s ${n(-i * 0.2)}s infinite">${critter({ look: [3, 4] })}</g>${rect(-24, -34, 48, 30, '#2b2f3a', 'rx="3"')}<circle cx="0" cy="-19" r="4" fill="#d97757" style="animation:pulse 1.6s ${n(-i * 0.5)}s infinite"/>${rect(-28, -5, 56, 5, '#9aa3b5', 'rx="2"')}</g></g>`,
    )
    .join('')
}

// The two of them, each moving from its last pose where that just changed
// (`room.was`, at `room.at`; `time.now` is the same clock).
function castOf(room, time, hasKitten) {
  const since = room.was && room.at !== undefined && time.now !== undefined ? (time.now - room.at) / 1000 : -1
  const still = svg => ({ svg, css: '' })
  const a =
    since >= 0 && room.was.mascot !== room.mascot && MASCOT_SPOT[room.was.mascot] && MASCOT_SPOT[room.mascot]
      ? blend('mdash', mascot(room), mascot({ ...room, mascot: room.was.mascot, isWaiting: false }), MASCOT_SPOT[room.was.mascot], MASCOT_SPOT[room.mascot], since)
      : still(mascot(room))

  if (!hasKitten) return a
  const b =
    since >= 0 && room.was.kitten !== room.kitten && KITTEN_SPOT[room.was.kitten] && KITTEN_SPOT[room.kitten]
      ? // The kitten does not dash (the user's call): it fades out where it was and in where it is.
        blend('kdash', kitten(room), kitten({ ...room, kitten: room.was.kitten }), KITTEN_SPOT[room.kitten], KITTEN_SPOT[room.kitten], since)
      : still(kitten(room))

  return { svg: a.svg + b.svg, css: a.css + b.css }
}

// What the desktop app's backdrop frame cannot take (found by taking the
// scene apart, 2026-11-15): a CSS `filter`, or an `@media` rule, anywhere in
// the document stills every animation in it. So the cast is darkened by
// `shaded`, and nothing moves the two sides inward for a narrow window.
// A mask and a clip path were tested and are fine, though none is used now.
//
// `look` is what the person chose in the plugin's options: `clock` is `24h` or
// `12h`, `wall` a name in WALLS, `hasKitten` false for a room with no kitten.
export function buildScene(room, time = { h: 12, m: 0, s: 0 }, look = {}) {
  const L = LIGHT[room.phase] ?? LIGHT.day
  const WALL = WALLS[look.wall] ?? WALLS.slate
  const hasKitten = look.hasKitten !== false
  const isAsleep = room.mascot === 'sleep'
  const isLampOn = L.lamp === 1 && !isAsleep
  const dim = isAsleep ? Math.max(L.dim, 0.62) : L.dim
  const screenMode =
    room.mascot === 'work'
      ? 'work'
      : room.mascot === 'facepalm'
        ? 'fail'
        : room.mascot === 'cheer'
          ? 'pass'
          : isAsleep
            ? 'off'
            : 'idle'
  const players = castOf(room, time, hasKitten)
  const style = `<style>${CSS}${look.tv ? tvNames(look.tv).css : ''}${players.css}</style>`
  const cast = `<g>${shaded(players.svg + helpers(room.helpers), L.chars)}</g>`

  // The wash covers the room but not the window glass.
  // One path with a hole per pane, where a mask would have been.
  const panes = PANES.map(
    ([x, w]) => `M${n(x * WIN.s + WIN.x)} ${n(GLASS.y * WIN.s + WIN.y)}h${n(w * WIN.s)}v${n(GLASS.h * WIN.s)}h-${n(w * WIN.s)}Z`,
  ).join('')
  const wash = `<path d="M0 0H${W}V${H}H0Z${panes}" fill-rule="evenodd" fill="${L.tint}" opacity="${dim}"/>`
  const left = []
  const right = []

  if (isLampOn) {
    left.push(
      `<g transform="${LOUNGE}"><circle cx="285" cy="${420 + LAMP_CUT}" r="300" fill="url(#lampGlow)"/>${SHADE} fill="#fff3c9"/></g>`,
    )
  }
  // The air conditioner runs while the mascot rests, not while it works.
  if (!['work', 'facepalm', 'cheer', 'notice'].includes(room.mascot)) {
    left.push(airFlow())
  }
  if (L.beam && !room.isRaining) {
    left.push(`<path d="M36 ${640 + DROP}H348L360 900H0Z" fill="${L.beam[0]}" opacity="${L.beam[1]}"/>`)
  }
  if (dim > 0.2 && screenMode !== 'off') {
    right.push(`<ellipse cx="${PC.x + PC.w / 2}" cy="490" rx="250" ry="170" fill="url(#screenGlow)"/>`)
  }
  const isSteamy = room.mascot === 'work' || room.mascot === 'facepalm'
  const steam = isSteamy
    ? [0, 1, 2]
        .map(
          i =>
            `<path d="M${MUG_X + 4 + i * 4} 540q-4-6 0-12" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0" style="animation:steam 2.4s ${n(i * 0.8)}s infinite"/>`,
        )
        .join('')
    : ''

  return hoist([
    OPEN,
    `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.sky[0]}"/><stop offset="1" stop-color="${L.sky[1]}"/></linearGradient>`,
    `<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${WALL[0]}"/><stop offset="1" stop-color="${WALL[1]}"/></linearGradient>`,
    `<radialGradient id="lampGlow"><stop offset="0" stop-color="#ffd98a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="screenGlow"><stop offset="0" stop-color="#8fb8ff" stop-opacity=".34"/><stop offset="1" stop-color="#8fb8ff" stop-opacity="0"/></radialGradient>`,
    // The wall's gradient again, in the window's own scaled coordinates.
    `<linearGradient id="wallOver" gradientUnits="userSpaceOnUse" x1="0" y1="${n(-WIN.y / WIN.s)}" x2="0" y2="${n((640 - WIN.y) / WIN.s)}"><stop offset="0" stop-color="${WALL[0]}"/><stop offset="1" stop-color="${WALL[1]}"/></linearGradient></defs>`,
    style,
    rect(0, 0, W, 640, 'url(#wall)'),
    floor(),
    `<g class="zl"><g transform="${WINDOW}">${outside(room, L)}${windowFrame(L)}</g><g transform="${LOUNGE}">${lamp(isLampOn)}${couch()}</g>${airCase()}${catBed()}${plant()}</g>`,
    `<g class="zr"><g transform="${DESK}">${desk()}<g transform="translate(72,0)">${chair()}</g></g>${shelf()}${clockCase()}${look.tv ? tvCase() : poster()}</g>`,
    wash,
    `<g class="zl">${left.join('')}</g>`,
    `<g class="zr"><g transform="${DESK}">${right.join('')}${screens(screenMode, room.doing?.kind)}${deskLamp(isSteamy, dim > 0.2)}<rect x="1468" y="598" width="6" height="68" rx="3" fill="#ff3d7f" style="animation:pulse 2.4s infinite"/>${steam}</g>${clockFace(time, look.clock)}${look.tv ? tvFace(look.tv, room.mascot === 'work' ? room.doing : undefined) : ''}</g>`,
    cast,
    room.fx === 'confetti' ? confetti() : '',
    '</svg>',
  ].join(''), time.h * 3600 + time.m * 60 + (time.s ?? 0) + (time.ms ?? 0) / 1000)
}
