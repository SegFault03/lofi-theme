import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import {
  activityOf,
  classify,
  dateLabel,
  diffStat,
  folderName,
  greeting,
  KITTEN_POSES,
  MASCOT_POSES,
  PHASES,
  phaseAt,
  prFacts,
  prState,
  resetLabel,
  restPose,
  screenOf,
} from './logic.js'
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
  // No hook of the mod's answers for a reply: what is beneath is drawn as it is.
  const ui = await $.ui.mount({
    plugin: 'lofi-theme',
    surface: 'desktop',
    component: 'AssistantMessage',
    requestId: 'm1',
    props: { text: 'hello' },
  } as never)

  expect(await ui.keepsBeneath()).toBe(true)
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

// ---------------------------------------------------------------- the TV

const FULL = {
  project: 'lofi-theme',
  chat: 'Add a live TV to the room',
  branch: 'main',
  fiveHour: { percent: 42, resets: '14:30' },
  week: { percent: 95, resets: 'Tue 09:00' },
  context: { window: 200000, tokens: 74000, percent: 37 },
  feed: ['turn 12', '$1.84', 'since 09:15'],
}

test('the TV fits the cap, keeps to the right side and adds no style attributes', () => {
  for (const phase of PHASES) {
    for (const tv of [FULL, { project: '', feed: [] }]) {
      const svg = buildScene({ phase, mascot: 'cheer', kitten: 'prowl', fx: 'fireworks', isRaining: true, isWaiting: true }, undefined, { tv })

      expect(svg.length < 131072).toBe(true)
      expect(svg.includes('NaN') || svg.includes('undefined')).toBe(false)
      expect(svg.includes('style="')).toBe(false)
      expect(svg).not.toMatch(/filter|@media/)
      for (const [, x] of svg.matchAll(/<g class="z[lr]"><g transform="translate\((-?[\d.]+),/g)) {
        expect(Number(x) <= 360 || Number(x) >= 1225).toBe(true)
      }
    }
  }
  const room = { phase: 'day', mascot: 'phone', kitten: 'loaf', fx: 'none', isRaining: false, isWaiting: false } as const
  const svg = buildScene(room, undefined, { tv: FULL })

  expect(svg).toContain('5H 42%')
  expect(svg).toContain('WK 95%')
  expect(svg).toContain('CTX 37%')
  expect(svg).toContain('74k / 200k')
  // No TV data, no TV.
  expect(buildScene(room)).not.toContain('tvClip')
})

test('names on the TV are escaped, and a long one pans under a clip', () => {
  const svg = buildScene(
    { phase: 'day', mascot: 'phone', kitten: 'loaf', fx: 'none', isRaining: false, isWaiting: false },
    undefined,
    { tv: { ...FULL, project: '<b>&"x" style="y"', chat: 'a chat name far too long to fit on one line of the screen' } },
  )

  expect(svg).not.toContain('<b>')
  expect(svg).not.toContain('style="')
  expect(svg).toContain('&#60;b&#62;&#38;')
  // The whole name is there, and moves by a keyframe of its own.
  expect(svg).toContain('a chat name far too long to fit on one line of the screen</text>')
  expect(svg).toMatch(/@keyframes pana\{[^@]*translateX\(-\d+px\)/)
  expect(svg).toContain('url(#pana)')
  // The project's name fits: it stands still.
  expect(svg).not.toContain('@keyframes panb')
  // The chat's name comes before the project's, and no LIVE mark.
  expect(svg.indexOf('a chat name')).toBeLessThan(svg.indexOf('&#60;b&#62;'))
  expect(svg).not.toContain('>LIVE<')
})

test('the facts of the session are rounded into what the TV shows', () => {
  const now = new Date(2026, 10, 15, 12, 0)
  const screen = screenOf(
    {
      project: 'lofi-theme',
      branch: 'feature/tv',
      turns: 3,
      startedAt: new Date(2026, 10, 15, 9, 5).getTime(),
      context: { window: 200000, tokens: 74499, percent: 37.2 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 41.6, resetsAt: new Date(2026, 10, 15, 14, 30).toISOString() },
        { kind: 'seven_day', percentUsed: 18.4, resetsAt: new Date(2026, 10, 17, 9, 0).toISOString() },
      ],
      cost: { usd: 1.837 },
    },
    now,
  )

  expect(screen.branch).toBe('feature/tv')
  // A branch with no project to stand under is not shown.
  expect(screenOf({ branch: 'main' }, now).branch).toBe(undefined)
  expect(screen.fiveHour).toEqual({ percent: 42, resets: '14:30' })
  expect(screen.week).toEqual({ percent: 18, resets: 'Tue 09:00' })
  expect(screen.context).toEqual({ window: 200000, tokens: 74000, percent: 37 })
  expect(screen.feed).toEqual(['turn 3', '$1.84', 'since 09:05'])
  // Nothing known yet: placeholders, not zeroes.
  expect(screenOf({}, new Date(2026, 10, 15, 19, 0))).toEqual({ project: '', chat: undefined, greeting: 'Good evening', branch: undefined, fiveHour: undefined, week: undefined, context: undefined, feed: [] })
  expect(resetLabel(undefined)).toBe(undefined)
  expect(resetLabel('not a date')).toBe(undefined)
  expect(folderName('F:\\code\\lofi-theme\\')).toBe('lofi-theme')
  expect(folderName('owner/repo')).toBe('repo')
})

test('a measurement and the name of the chat reach the TV', async ($, on) => {
  on('command.register', () => ({ value: { command: 'room' } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('classic.UserPromptSubmit', () => ({}))
  on('classic.SessionStart', () => ({}))

  await $.session.start({ cwd: '/work/my-project', surface: 'desktop', isInteractive: true })
  let { source } = await drawn($)

  // On from the start, with placeholders until the first reading.
  expect(source).toContain('tvClip')
  expect(source).toContain('my-project')
  expect(source).toContain('5H --')

  await $.session.measure({
    context: { window: 200000, tokens: 74000, percent: 37 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 41.6 },
      { kind: 'seven_day', percentUsed: 18 },
    ],
    cost: { usd: 1.84 },
    changed: ['context', 'rateLimits', 'cost'],
  })
  await $.classic.UserPromptSubmit({ prompt: 'hello', session_title: 'Fix <the> clock' })
  source = (await drawn($)).source

  expect(source).toContain('5H 42%')
  expect(source).toContain('WK 18%')
  expect(source).toContain('CTX 37%')
  expect(source).toContain('$1.84')
  expect(source).toContain('Fix &#60;the&#62; clock')

  // A compaction is the same chat; /clear is a new one.
  await $.classic.SessionStart({ source: 'compact' })
  expect((await drawn($)).source).toContain('Fix &#60;the&#62; clock')
  await $.classic.SessionStart({ source: 'clear' })
  source = (await drawn($)).source
  expect(source).not.toContain('Fix &#60;the&#62; clock')
  expect(source).toMatch(/Good (morning|afternoon|evening|night)/)
})

test('the tv option takes the TV down', { options: { tv: false } }, async ($, on) => {
  on('command.register', () => ({ value: { command: 'room' } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.session.measure({ context: { window: 200000 }, rateLimits: [], changed: ['context'] })
  expect((await drawn($)).source).not.toContain('tvClip')
})

test('the TV colours its figures and greets where a name is missing', () => {
  const room = { phase: 'day', mascot: 'phone', kitten: 'loaf', fx: 'none', isRaining: false, isWaiting: false } as const
  const at = (percent: number) => buildScene(room, undefined, { tv: { project: 'p', chat: 'c', feed: [], fiveHour: { percent }, context: { window: 100, percent } } })

  // Green to half, yellow past it, red past four fifths: the text and the bar.
  expect(at(50)).toMatch(/fill="#7ae582">5H 50%/)
  expect(at(51)).toMatch(/fill="#ffd23f">5H 51%/)
  expect(at(81)).toMatch(/fill="#ff5d6c">5H 81%/)
  expect(at(81)).toMatch(/fill="#ff5d6c">CTX 81%/)
  expect(at(20)).toMatch(/fill="#7ae582">CTX 20%/)

  expect(greeting(9, 'ada')).toBe('Good morning, Ada')
  expect(greeting(14)).toBe('Good afternoon')
  expect(greeting(19, ' ')).toBe('Good evening')
  expect(greeting(2, 'ada')).toBe('Good night, Ada')
  const evening = new Date(2026, 10, 15, 19, 0)

  expect(screenOf({ user: 'ada' }, evening).greeting).toBe('Good evening, Ada')
  expect(screenOf({ project: 'p', chat: 'c', user: 'ada' }, evening).greeting).toBe(undefined)
  expect(buildScene(room, undefined, { tv: screenOf({ user: 'ada' }, evening) })).toContain('Good evening, Ada')
  // With the project known, the greeting takes the chat's line.
  expect(buildScene(room, undefined, { tv: screenOf({ project: 'p', user: 'ada' }, evening) })).toContain('Good evening, Ada')
})

test('the date stands under the clock, and the air conditioner runs at rest', () => {
  const room = { phase: 'day', mascot: 'phone', kitten: 'prowl', fx: 'none', isRaining: false, isWaiting: false } as const

  expect(dateLabel(new Date(2026, 10, 15))).toBe('SUN 15 NOV')
  const svg = buildScene(room, { h: 20, m: 29, s: 0, day: 'SUN 15 NOV' })

  expect(svg).toContain('>SUN 15 NOV</text>')
  expect(clockShows(svg)).toBe(clockShows(buildScene(room, { h: 20, m: 29, s: 0 })))
  expect(svg).toContain('animation:cool')
  expect(buildScene({ ...room, mascot: 'work' })).not.toContain('animation:cool')
})

test('the ticker says each thing once, and warns of what is running out', () => {
  const room = { phase: 'day', mascot: 'phone', kitten: 'loaf', fx: 'none', isRaining: false, isWaiting: false } as const
  const calm = buildScene(room, undefined, { tv: FULL })

  expect(calm.split('turn 12').length).toBe(2)
  // A line that fits does not slide.
  expect(calm).not.toContain('animation:tick')
  const tight = screenOf({
    rateLimits: [
      { kind: 'five_hour', percentUsed: 86 },
      { kind: 'seven_day', percentUsed: 91 },
    ],
    context: { window: 200000, tokens: 170000, percent: 85 },
  })

  expect(tight.feed).toEqual(['Low on 5h usage!', 'Low on weekly usage!', 'Context limit reaching soon!'])
  expect(buildScene(room, undefined, { tv: tight })).toContain('animation:tick')
  expect(screenOf({ rateLimits: [{ kind: 'five_hour', percentUsed: 80 }] }).feed).toEqual([])
})

test('the branch stands under the project, and follows a checkout', async ($, on) => {
  let branch = 'main'

  on('command.register', () => ({ value: { command: 'room' } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('classic.UserPromptSubmit', () => ({}))
  on('process.run', () => (branch === '' ? { value: { exitCode: 128, stdout: '', stderr: 'not a git repository', isStdoutTruncated: false, isStderrTruncated: false } } : { value: { exitCode: 0, stdout: `${branch}
`, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))

  await $.session.start({ cwd: '/work/my-project', surface: 'desktop', isInteractive: true })
  expect((await drawn($)).source).toContain('>main</text>')

  // Changed outside the session: the next prompt reads it again.
  branch = 'fix/clock'
  await $.classic.UserPromptSubmit({ prompt: 'go on' })
  let { source } = await drawn($)

  expect(source).toContain('>fix/clock</text>')
  expect(source).not.toContain('>main</text>')

  // No repository, no branch line.
  branch = ''
  await $.classic.UserPromptSubmit({ prompt: 'and now' })
  source = (await drawn($)).source
  expect(source).not.toContain('>fix/clock</text>')
  expect(source).not.toContain('url(#panc)')
})

test('what is not committed and the pull request are read into a few words', () => {
  expect(diffStat(' 3 files changed, 133 insertions(+), 32 deletions(-)\n')).toEqual({ added: 133, removed: 32 })
  expect(diffStat(' 1 file changed, 1 insertion(+)\n')).toEqual({ added: 1, removed: 0 })
  expect(diffStat('')).toBe(undefined)
  expect(diffStat('fatal: bad revision')).toBe(undefined)

  const pr = (more: object) => JSON.stringify({ state: 'OPEN', isDraft: false, reviewDecision: '', statusCheckRollup: [], ...more })
  const run = (conclusion: string, status = 'COMPLETED') => ({ __typename: 'CheckRun', status, conclusion })

  expect(prState(pr({}))).toBe('open')
  expect(prState(pr({ isDraft: true }))).toBe('draft')
  expect(prState(pr({ statusCheckRollup: [run('SUCCESS'), run('SKIPPED')] }))).toBe('passing')
  expect(prState(pr({ statusCheckRollup: [run('SUCCESS'), run('', 'IN_PROGRESS')] }))).toBe('pending')
  expect(prState(pr({ statusCheckRollup: [{ __typename: 'StatusContext', state: 'PENDING' }] }))).toBe('pending')
  // The worst news wins.
  expect(prState(pr({ isDraft: true, reviewDecision: 'CHANGES_REQUESTED', statusCheckRollup: [run('FAILURE'), run('', 'QUEUED')] }))).toBe('failing')
  expect(prState(pr({ reviewDecision: 'CHANGES_REQUESTED', statusCheckRollup: [run('SUCCESS')] }))).toBe('changes')
  expect(prState(pr({ state: 'MERGED' }))).toBe('merged')
  expect(prState(pr({ state: 'CLOSED' }))).toBe('closed')
  expect(prState('no pull requests found')).toBe(undefined)
  expect(prState('null')).toBe(undefined)

  // The number and the time of the merge come with the word.
  const merged = Date.UTC(2026, 10, 15, 12, 0)

  expect(prFacts(pr({ number: 16 }))).toEqual({ state: 'open', number: 16, mergedAt: undefined })
  expect(prFacts(pr({ state: 'MERGED', number: 16, mergedAt: '2026-11-15T12:00:00Z' }))).toEqual({ state: 'merged', number: 16, mergedAt: merged })
  expect(prFacts('no pull requests found')).toBe(undefined)

  // A merged request keeps its card for a day, and then it goes by itself.
  const facts = { project: 'p', branch: 'b', pr: 'merged', prNumber: 16, prMergedAt: merged } as const
  const shown = screenOf(facts, new Date(merged + 23 * 3_600_000))

  expect([shown.pr, shown.prNumber]).toEqual(['merged', 16])
  const room = { phase: 'day', mascot: 'phone', kitten: 'loaf', fx: 'none', isRaining: false, isWaiting: false } as const

  expect(buildScene(room, undefined, { tv: shown })).toContain('>Merged #16</text>')
  const gone = screenOf(facts, new Date(merged + 25 * 3_600_000))

  expect([gone.pr, gone.prNumber]).toEqual([undefined, undefined])
  // An open one stays, however old.
  expect(screenOf({ ...facts, pr: 'open' }, new Date(merged + 99 * 3_600_000)).pr).toBe('open')
})

test('a scene drawn again goes on from where its loops were', () => {
  const room = { phase: 'day', mascot: 'phone', kitten: 'prowl', fx: 'none', isRaining: false, isWaiting: false } as const
  const at = (s: number, ms = 0) => buildScene(room, { h: 0, m: 0, s, ms })

  // The walk takes 16 s: five seconds in, it starts five seconds in.
  expect(at(0)).toContain('animation:walk 16s 0s linear infinite')
  expect(at(5)).toContain('animation:walk 16s -5s linear infinite')
  expect(at(5)).toContain('animation:face 16s -5s steps(1) infinite')
  expect(at(21, 500)).toContain('animation:walk 16s -5.5s linear infinite')
  // A delay the builder wrote is kept: the second leg stays 0.2 s ahead.
  expect(at(0)).toContain('animation:step 0.4s -0.2s infinite')
  expect(at(0.1 * 10)).toContain('animation:step 0.4s -0.4s infinite')
  // The clock's glyphs keep their own delays.
  expect(buildScene(room, { h: 0, m: 0, s: 5 })).toContain('animation:clko 600s -5s steps(1) infinite')
  // The kitten turns about its feet: no box whose middle moves with the tail.
  expect(at(0)).not.toMatch(/class="c[^"]*"[^>]*><ellipse cx="0" cy="-16" rx="20"/)
})

test('a change of pose is drawn as a move from the old spot', () => {
  const base = { phase: 'day', fx: 'none', isRaining: false, isWaiting: false } as const
  const room = { ...base, mascot: 'work', kitten: 'loaf', was: { mascot: 'phone', kitten: 'loaf' }, at: 1_000_000 } as const
  const at = (ms: number) => buildScene(room, { h: 12, m: 0, s: 0, now: 1_000_000 + ms })
  const plain = buildScene({ ...base, mascot: 'work', kitten: 'loaf' }, { h: 12, m: 0, s: 0 })

  // At once: the old pose fades where it stood, the new one dashes from there.
  expect(at(0)).toContain('@keyframes mdash{0%,12%{transform:translate(-1178px,-10px)}100%{transform:translate(0px,0px)}}')
  expect(at(0)).toContain('animation:mdash 1s 0s ease-out')
  expect(at(0)).toContain('animation:gone 0.3s 0s linear')
  // The old pose is unseen without the animation, for a surface that draws still.
  expect(at(0)).toMatch(/<g class="s\d+" opacity="0"><g class="zl">/)
  // The kitten kept its pose: it does not move.
  expect(at(0)).not.toContain('kdash')
  // Drawn again half a second in, the dash goes on; the fade is over.
  expect(at(500)).toContain('animation:mdash 1s -0.5s ease-out')
  expect(at(500)).not.toContain('animation:gone')
  // After the move, and with no clock or no old pose, the room as it is.
  expect(at(1500)).toBe(plain)
  expect(buildScene(room, { h: 12, m: 0, s: 0 })).toBe(plain)

  // Two poses on one spot only fade into each other.
  const nap = buildScene({ ...base, mascot: 'sleep', kitten: 'sleep', was: { mascot: 'nap', kitten: 'loaf' }, at: 0 }, { h: 12, m: 0, s: 0, now: 100 })

  expect(nap).not.toContain('mdash')
  expect(nap).toContain('animation:show 0.3s -0.1s linear')
  // The kitten never dashes: it fades out on the couch and in on its bed.
  expect(nap).not.toContain('kdash')
  expect(nap.match(/animation:gone 0\.3s -0\.1s linear/g)?.length).toBe(1)
  expect(nap).toContain(`translate(300,816)`)
  // No fill mode, and no inline style, in any of it.
  expect(at(0)).not.toMatch(/\sstyle="|forwards|backwards|both/)
})

test('the session stores the pose it leaves, once per change', async ($, on) => {
  on('command.register', () => ({ value: { command: 'room' } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('classic.UserPromptSubmit', () => ({}))

  await $.session.start({ cwd: '/work/my-project', surface: 'desktop', isInteractive: true })
  await $.classic.UserPromptSubmit({ prompt: 'go' })
  // The mascot is on its way to the desk.
  expect((await drawn($)).source).toContain('@keyframes mdash')
})

test('a tool call is read for what the desk shows', () => {
  expect(activityOf('Read', { file_path: 'F:\\code\\app\\hooks\\scene.js' })).toEqual({ kind: 'read', label: 'reading scene.js' })
  expect(activityOf('Grep', { pattern: 'secret', path: '/work/app' })).toEqual({ kind: 'read', label: 'searching' })
  expect(activityOf('Edit', { file_path: '/work/app/a-very-long-file-name-indeed.test.tsx' })).toEqual({ kind: 'edit', label: 'editing a-very-long-file-na…' })
  // A command shows its first word only: no argument, no path.
  expect(activityOf('Bash', { command: '/usr/bin/git commit -m "a secret"' })).toEqual({ kind: 'shell', label: 'running git' })
  expect(activityOf('PowerShell', { command: '' })).toEqual({ kind: 'shell', label: 'running a command' })
  expect(activityOf('WebSearch', { query: 'x' })).toEqual({ kind: 'web', label: 'searching the web' })
  expect(activityOf('mcp__Claude_Browser__navigate', { url: 'https://example.com' })).toEqual({ kind: 'web', label: 'browsing' })
  expect(activityOf('AskUserQuestion', {})).toBe(undefined)
})

test('the monitor, the mascot and the ticker show the tool in hand', () => {
  const base = { phase: 'day', mascot: 'work', kitten: 'loaf', fx: 'none', isRaining: false, isWaiting: false } as const
  const tv = { project: 'p', chat: 'c', feed: ['turn 3'] }
  const draw = (kind?: 'read' | 'edit' | 'shell' | 'web') =>
    buildScene(kind ? { ...base, doing: { kind, label: `${kind} <b>` } } : base, { h: 12, m: 0, s: 0 }, { tv })

  // An edit is the typing there always was; each other kind has its own screen.
  expect(draw('edit')).toContain('animation:type 5s')
  expect(draw('read')).toContain('animation:scan 3.2s')
  expect(draw('shell')).toContain('fill="#0b0d10"')
  expect(draw('web')).toContain('fill="#e9edf3"')
  // The words lead the ticker, escaped.
  expect(draw('read')).toContain('read &#60;b&#62;  ·  turn 3')
  expect(draw()).not.toContain('  ·  turn 3')
  // Away from the desk nothing of it shows.
  const away = buildScene({ ...base, mascot: 'phone', doing: { kind: 'shell', label: 'running git' } }, { h: 12, m: 0, s: 0 }, { tv })

  expect(away).not.toContain('running git')
  expect(away).not.toContain('fill="#0b0d10"')
  for (const kind of ['read', 'edit', 'shell', 'web'] as const) {
    expect(draw(kind)).not.toMatch(/\sstyle="|filter|@media/)
    expect(draw(kind).length).toBeLessThan(131_072)
  }
})

test('typing between turns perks the mascot up; a tool in hand reaches the desk', async ($, on) => {
  on('command.register', () => ({ value: { command: 'room' } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.edit', (_, e) => ({ text: e.text + e.inputText, cursor: e.cursor + e.inputText.length }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('tool.call', () => ({ result: {} }))

  await $.session.start({ cwd: '/work/my-project', surface: 'desktop', isInteractive: true })
  await $.prompt.edit({ origin: { kind: 'user' }, text: '', cursor: 0, start: 0, end: 0, inputText: 'h' })
  // The exclamation mark of the notice pose pops up.
  expect((await drawn($)).source).toContain('animation:pop .4s')

  await $.turn.start({ text: 'go', turnId: 't1' })
  // No tool in hand yet: it thinks, at a dim screen.
  const thinking = (await drawn($)).source

  expect(thinking).toContain('>thinking')
  expect(thinking).toContain('fill="#141925"')
  expect(thinking).not.toContain('animation:type 5s')
  await $.tool.call({ tool: 'Read', file_path: '/work/my-project/scene.js' })
  const { source } = await drawn($)

  expect(source).toContain('animation:scan 3.2s')
  expect(source).toContain('reading scene.js')
})

test('/room log lists the redraws, and two changes at once are one redraw each', async ($, on) => {
  on('command.register', () => ({ value: { command: 'room' } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('tool.call', () => ({ result: {} }))
  const log = async () =>
    ((await $.command.run({ command: 'room', args: 'log', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })) as { text: string }).text

  await $.session.start({ cwd: '/work/my-project', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'go', turnId: 't1' })
  const before = (await log()).split('\n').length

  // The tool's start and its end both ask for the room: it is drawn once.
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  const after = await log()

  expect(after).toMatch(/^\d+ redraws in the last minute/)
  expect(after).toContain('room: work, kitten ')
  expect(after.split('\n').length - before).toBe(1)
  expect(after.split('\n').pop()).toContain(', shell')
})

test('each subagent at work has a helper by the desk, three at most', async ($, on) => {
  const room = { phase: 'day', mascot: 'phone', kitten: 'loaf', fx: 'none', isRaining: false, isWaiting: false } as const
  const lids = (svg: string) => svg.match(/scale\(\.65\)/g)?.length ?? 0

  expect(lids(buildScene(room))).toBe(0)
  expect(lids(buildScene({ ...room, helpers: 2 }))).toBe(2)
  expect(lids(buildScene({ ...room, helpers: 9 }))).toBe(3)
  // On the right side, clear of the chat.
  expect(buildScene({ ...room, helpers: 3 })).toContain('translate(1424,856) scale(.65)')

  on('command.register', () => ({ value: { command: 'room' } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: 'done' }))

  await $.session.start({ cwd: '/work/my-project', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'look around', turnId: 'a1', agentId: 'agent-1' })
  await $.turn.start({ text: 'look elsewhere', turnId: 'a2', agentId: 'agent-2' })
  await $.turn.start({ text: 'main', turnId: 't1' })
  expect(lids((await drawn($)).source)).toBe(2)

  await $.turn.complete({ turnId: 'a1', agentId: 'agent-1', reason: 'answer', isAborted: false, answer: 'done', durationMs: 1000 })
  await $.turn.start({ text: 'main again', turnId: 't2' })
  expect(lids((await drawn($)).source)).toBe(1)
})

test('the project follows the session to another folder', async ($, on) => {
  let folder = '/tmp/spare-3ASnlA'

  on('command.register', () => ({ value: { command: 'room' } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: folder }))
  on('classic.UserPromptSubmit', () => ({}))

  await $.session.start({ cwd: folder, surface: 'desktop', isInteractive: true })
  expect((await drawn($)).source).toContain('spare-3ASnlA')

  // The app started the session in a spare folder and then moved it.
  folder = '/work/my-project'
  await $.classic.UserPromptSubmit({ prompt: 'go on' })
  const { source } = await drawn($)

  expect(source).toContain('my-project')
  expect(source).not.toContain('spare-3ASnlA')
})

test('the diff and the pull request stand beside the branch, and go with it', async ($, on) => {
  let branch = 'main'
  let pull = JSON.stringify({ number: 16, state: 'OPEN', isDraft: false, reviewDecision: '', statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'FAILURE' }] })
  const out = (stdout: string, exitCode = 0) => ({ value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })

  on('command.register', () => ({ value: { command: 'room' } }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('classic.UserPromptSubmit', () => ({}))
  on('process.run', (_, e) => {
    const argv = (e as unknown as { argv: readonly string[] }).argv

    if (argv[0] === 'gh') return pull === '' ? out('', 1) : out(pull)

    return argv[1] === 'branch' ? out(`${branch}\n`) : out(' 2 files changed, 1204 insertions(+), 32 deletions(-)\n')
  })

  await $.session.start({ cwd: '/work/my-project', surface: 'desktop', isInteractive: true })
  await $.classic.UserPromptSubmit({ prompt: 'one' })
  let { source } = await drawn($)

  expect(source).toContain('>+1.2k</tspan>')
  expect(source).toContain('>/</tspan>')
  expect(source).toContain('>-32</tspan>')
  // The card: an Open label, and the checks beside it.
  expect(source).toContain('>Open #16</text>')
  expect(source).toContain('>checks failing</text>')
  // Failing checks: the red disc.
  expect(source).toContain('<circle r="4.5" fill="#ff5d6c"/>')

  // Another branch with no pull request: the mark goes.
  branch = 'throwaway'
  pull = ''
  await $.classic.UserPromptSubmit({ prompt: 'two' })
  await $.classic.UserPromptSubmit({ prompt: 'three' })
  source = (await drawn($)).source
  expect(source).toContain('>throwaway</text>')
  expect(source).not.toContain('<circle r="4.5" fill="#ff5d6c"/>')
  expect(source).not.toContain('>Open #16</text>')
})
