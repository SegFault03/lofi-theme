import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import { classify, KITTEN_POSES, MASCOT_POSES, PHASES, phaseAt, restPose } from './logic.js'
import { buildScene, clockColumns } from './scene.js'

const BACKDROP = {
  plugin: 'lofi-theme',
  component: 'Backdrop',
  requestId: 'backdrop',
  props: {
    scene: 'living-room',
    plugin: 'lofi-theme',
    glass: { blur: 3, opacity: 0.5 },
  },
} as const

test('every room fits under the SVG cap', () => {
  let longest = 0

  for (const phase of PHASES) {
    for (const mascot of MASCOT_POSES) {
      for (const kitten of KITTEN_POSES) {
        for (const fx of ['none', 'confetti', 'fireworks'] as const) {
          const svg = buildScene({ phase, mascot, kitten, fx, isRaining: true, isWaiting: true })

          longest = Math.max(longest, svg.length)
          expect(svg.includes('NaN') || svg.includes('undefined')).toBe(false)
          // Animations live in the stylesheet, never in style attributes.
          expect(svg.includes('style="')).toBe(false)
        }
      }
    }
  }
  expect(longest < 131072).toBe(true)
})

test('the clock picks the light and the rest pose', () => {
  expect(phaseAt(6)).toBe('dawn')
  expect(phaseAt(12)).toBe('day')
  expect(phaseAt(17)).toBe('golden')
  expect(phaseAt(19)).toBe('dusk')
  expect(phaseAt(23)).toBe('night')
  expect(phaseAt(2)).toBe('night')
  expect(restPose(2, 'idle', 0.5)).toBe('sleep')
  expect(restPose(14, 'idle', 0)).toBe('nap')
  expect(restPose(2, 'waiting', 0)).toBe('scroll')
})

test('shell commands are read for what they mean', () => {
  expect(classify('gh pr merge 12 --squash')).toBe('merge')
  expect(classify('git commit -m "x"')).toBe('commit')
  expect(classify('git -C repo commit -m "x"')).toBe('commit')
  expect(classify('npm test')).toBe('test')
  expect(classify('git status')).toBe(null)
  expect(classify(undefined)).toBe(null)
})

test('the session moves the mascot: work, then fireworks on a merge', async ($, on) => {
  on('command.register', () => ({ value: { command: 'room' } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('tool.call', () => ({ result: {} }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'ship it', turnId: 't1' })

  let ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toMatch(/"work" pose/)
  await ui.unmount()

  await $.tool.call({ tool: 'Bash', command: 'gh pr merge 7 --squash' })

  ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  const svg = await ui.find({ type: 'Svg' })
  expect(svg?.props.alt).toMatch(/"cheer" pose.*"startle" pose/)
  expect(String(svg?.props.source)).toMatch(/animation:burst/)
  // The sandboxed frame is where the desktop app plays the scene's animation.
  expect(svg?.props.isInteractive).toBe(true)
  await ui.unmount()
})

test('a turn, a commit and the end of the turn each move the mascot', async ($, on) => {
  on('command.register', () => ({ value: { command: 'room' } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: 'done' }))
  on('tool.call', () => ({ result: {} }))

  const alt = async () => {
    const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
    const text = String((await ui.find({ type: 'Svg' }))?.props.alt)
    await ui.unmount()

    return text
  }

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'hello', turnId: 't1' })
  expect(await alt()).toMatch(/"work" pose/)

  await $.tool.call({ tool: 'PowerShell', command: 'git commit -m "mention gh pr merge"' })
  expect(await alt()).toMatch(/"cheer" pose/)

  await $.turn.complete({ turnId: 't1', reason: 'answer', isAborted: false, answer: 'done', durationMs: 1000 })
  expect(await alt()).toMatch(/"cheer" pose/)
})

test('/room poses the room and pins it', async ($, on) => {
  on('command.register', () => ({ value: { command: 'room' } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({
    command: 'room',
    args: 'night nap kitten-yarn',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })
  // Pinned: a turn starting does not send the mascot to the desk.
  await $.turn.start({ text: 'hi', turnId: 't1' })

  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  expect((await ui.find({ type: 'Svg' }))?.props.alt).toMatch(/night.*"nap" pose.*"yarn" pose/)
  await ui.unmount()
})

test('the animated scene keeps to what the desktop app plays', () => {
  const svg = buildScene({ phase: 'night', mascot: 'cheer', kitten: 'prowl', fx: 'fireworks', isRaining: true, isWaiting: true })

  // No keyframe mixes scale with a move, nothing fills "both", no filter moves.
  for (const [frames] of svg.matchAll(/@keyframes [a-z]+\{(?:[^{}]*\{[^{}]*\})*\}/g)) {
    expect(/scale/.test(frames) && /translate|rotate/.test(frames)).toBe(false)
    expect(frames.includes('filter')).toBe(false)
  }
  expect(/animation:[^;}]*\bboth\b/.test(svg)).toBe(false)
  expect(svg.includes('cubic-bezier')).toBe(false)
  // With a filter or a media rule in the document the app draws it all still.
  expect(svg).not.toMatch(/filter|@media/)
  // So the cast is darkened at night colour by colour: the mascot's orange.
  expect(svg).toContain('#a95d44')
  expect(buildScene({ phase: 'day', mascot: 'cheer', kitten: 'prowl', fx: 'none', isRaining: false, isWaiting: false })).not.toContain('#a95d44')
})

test('the middle of the room, where the chat sits, stays empty', () => {
  for (const mascot of MASCOT_POSES) {
    for (const kitten of KITTEN_POSES) {
      const svg = buildScene({ phase: 'day', mascot, kitten, fx: 'none', isRaining: false, isWaiting: true })

      // Every spot the cast is put at is on one of the two sides.
      for (const [, x] of svg.matchAll(/<g class="z[lr]"><g transform="translate\((-?[\d.]+),/g)) {
        expect(Number(x) <= 360 || Number(x) >= 1225).toBe(true)
      }
    }
  }
})

test('the mod leaves the chat rows as the app draws them', async ($, on) => {
  on('command.register', () => ({ value: { command: 'room' } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  // No hook of the mod's answers for a reply: only the app would draw it.
  await expect(
    $.ui.mount({
      plugin: 'lofi-theme',
      surface: 'desktop',
      component: 'AssistantMessage',
      requestId: 'm1',
      props: { text: 'hello' },
    } as never),
  ).rejects.toThrow(/no implementation for ui.render/)
})

// The texts of the clock that are lit when the scene is first drawn.
function clockShows(svg: string): string {
  const face = svg.slice(svg.lastIndexOf('fill="#ffb86b"'))
  const lit = [...face.matchAll(/<text ([^>]*)>([^<]+)<\/text>/g)].filter(([, attributes]) => !(attributes ?? '').includes('opacity="0"'))

  return lit.map(([, , label]) => label).join(' ')
}

test('the digital clock shows the hour and minute, 24-hour by default', () => {
  const room = { phase: 'day', mascot: 'phone', kitten: 'loaf', fx: 'none', isRaining: false, isWaiting: false } as const

  expect(clockShows(buildScene(room, { h: 9, m: 5, s: 0 }))).toBe('09 0 5 :')
  expect(clockShows(buildScene(room, { h: 23, m: 59, s: 59 }))).toBe('23 5 9 :')
  expect(clockShows(buildScene(room, { h: 0, m: 0 }))).toBe('00 0 0 :')
  expect(clockShows(buildScene(room, { h: 17, m: 40, s: 12 }, { clock: '12h' }))).toBe('05 4 0 :')
  expect(clockShows(buildScene(room, { h: 0, m: 7, s: 0 }, { clock: '12h' }))).toBe('12 0 7 :')
  // The hands are gone with their keyframes.
  expect(buildScene(room, { h: 9, m: 5 })).not.toMatch(/spin/)
})

test('each clock glyph is lit for its own slot and no other', () => {
  for (const [h, m, s] of [[0, 0, 0], [23, 59, 59], [9, 5, 30], [12, 30, 1], [19, 9, 59]] as const) {
    for (const column of clockColumns({ h, m, s })) {
      const slot = column[0]!.period / column.length

      expect(column.filter(glyph => glyph.isLit).length).toBe(1)
      for (const glyph of column) {
        // The delay runs the glyph's turn to where it is now: never ahead.
        expect(glyph.delay <= 0 && glyph.delay > -glyph.period).toBe(true)
        expect(glyph.isLit).toBe(-glyph.delay < slot)
      }
    }
    const [hours, tens, ones] = clockColumns({ h, m, s })
    const secondsIntoMinute = -ones!.find(glyph => glyph.isLit)!.delay

    expect(hours!.find(glyph => glyph.isLit)!.label).toBe(String(h).padStart(2, '0'))
    expect(tens!.find(glyph => glyph.isLit)!.label + ones!.find(glyph => glyph.isLit)!.label).toBe(String(m).padStart(2, '0'))
    // The ones glyph changes on the minute, the hour glyph on the hour.
    expect(secondsIntoMinute).toBe(s)
    expect(-hours!.find(glyph => glyph.isLit)!.delay).toBe(m * 60 + s)
  }
})

const drawn = async ($: Parameters<TestBody>[0]) => {
  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  const svg = await ui.find({ type: 'Svg' })
  const out = { alt: String(svg?.props.alt), source: String(svg?.props.source) }

  await ui.unmount()

  return out
}

test('with no options set, the room is the default one', async ($, on) => {
  on('command.register', () => ({ value: { command: 'room' } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const { alt, source } = await drawn($)

  expect(alt).toMatch(/kitten/)
  expect(source).toContain('#4b5663')
  // 24-hour: midnight is among the hour glyphs.
  expect(source).toContain('>00</text>')
})

test(
  'the options change the room',
  { options: { clockFormat: '12h', timeOfDay: 'night', wall: 'plum', kitten: false, celebrations: false, rain: false } },
  async ($, on) => {
    on('command.register', () => ({ value: { command: 'room' } }))
    on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
    on('session.start', (_, e) => ({ cwd: e.cwd }))
    on('turn.start', (_, e) => ({ turnId: e.turnId }))
    on('tool.call', () => ({ result: {} }))

    await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
    await $.turn.start({ text: 'ship it', turnId: 't1' })
    // No celebration: a commit leaves the mascot at work.
    await $.tool.call({ tool: 'Bash', command: 'git commit -m "x"' })
    const { alt, source } = await drawn($)

    expect(alt).toMatch(/at night.*"work" pose\.$/)
    expect(alt).not.toMatch(/kitten/)
    expect(source).toContain('#54485f')
    expect(source).not.toContain('#4b5663')
    // 12-hour: no "00" among the hour glyphs.
    expect(source).not.toContain('>00</text>')
    expect(source).not.toMatch(/animation:rain/)
  },
)

test('a wall the build does not know falls back to slate', { options: { wall: 'neon' } }, async ($, on) => {
  on('command.register', () => ({ value: { command: 'room' } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect((await drawn($)).source).toContain('#4b5663')
})
