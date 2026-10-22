// home.js - live cells on the home page: Game of Life, Lenia and the projects sparkline.
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
const still = matchMedia('(prefers-reduced-motion: reduce)').matches

// milic.life: one canvas, two kinds of life, picked by the :conway / :lenia tabs in the input cell.
// Each simulation keeps its own state; the hidden one pauses. The last tab is remembered per visitor.
;(() => {
  const root = document.getElementById('life')
  if (!root) return
  const rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) }
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
  const L = { M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'], I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
              l: ['#..', '#..', '#..', '#..', '#..', '#..', '###'], C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'] }

  // :conway - Game of Life on a 64x16 torus.
  // Default start is <MILIĆ>: the angle brackets keep it busy for ~1040 generations;
  // when it finally repeats, it starts over.
  const conway = (() => {
    const W = 64, H = 16
    const LWSS = ['#..#.', '....#', '#...#', '.####'], MWSS = ['..#...', '#...#.', '.....#', '#....#', '.#####'],
          HWSS = ['..##...', '#....#.', '......#', '#.....#', '.######']
    const name = () => {
      const out = [], word = 'MIlIC', width = [...word].reduce((s, c) => s + L[c][0].length + 1, -1)
      let x = (W - width) >> 1
      for (const c of word) { out.push([L[c], x, 5]); x += L[c][0].length + 1 }
      out.push([['.#', '#.'], x - 4, 2])                             // the acute on Ć
      return out
    }
    const P = {
      'milić': () => [...name(), [['...#', '..#.', '.#..', '#...', '.#..', '..#.', '...#'], 11, 5],      // <MILIĆ>
                      [['#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...'], 49, 5]],
      'gun': () => [[['........................#', '......................#.#', '............##......##............##', '...........#...#....##............##',
                      '##........#.....#...##', '##........#...#.##....#.#', '..........#.....#.......#', '...........#...#', '............##'], 14, 3]],
      'pulsar': () => { const r = [], q = '..###...###..', s = '#....#.#....#'
                        for (const y of [0, 5, 7, 12]) r[y] = q; for (const y of [2, 3, 4, 8, 9, 10]) r[y] = s
                        return [[[...r].map(x => x || ''), 25, 1]] },
      'pentadecathlon': () => [[['##########'], 27, 7]],
      'spaceships': () => [[LWSS, 40, 0], [HWSS, 25, 5], [MWSS, 20, 11]],
      'acorn': () => [[['.#.....', '...#...', '##..###'], 28, 6]],
      'soup': () => [[Array.from({ length: 12 }, () => Array.from({ length: 40 }, () => Math.random() < .35 ? '#' : '.').join('')), 12, 2]],
    }
    let a, seen, repeated, paint = 0
    return { W, H, tick: 120, gen: 0, current: 'milić', patterns: Object.keys(P),
      clock: ':generation =>', hint: 'click or drag to draw cells', label: 'Game of Life seeded with the letters MILIĆ',
      load(p) {
        this.current = p; a = new Uint8Array(W * H); this.gen = 0; seen = new Map(); repeated = false
        for (const [rows, x0, y0] of P[p]()) rows.forEach((r, y) => [...r].forEach((c, x) => c === '#' && (a[((y0 + y) % H) * W + (x0 + x) % W] = 1)))
      },
      step() {
        const b = new Uint8Array(W * H)
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          let n = 0
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
            if (dx || dy) n += a[((y + dy + H) % H) * W + (x + dx + W) % W]
          const i = y * W + x
          b[i] = n === 3 || (n === 2 && a[i]) ? 1 : 0
        }
        a = b; this.gen++
        if (this.current === 'milić') {               // the default start loops: once a state repeats, show the name again
          const key = a.join('')
          if (seen.has(key)) repeated = true; else seen.set(key, this.gen)
        }
      },
      over() { return repeated },
      render(g, w) {
        const c = w / W
        g.fillStyle = css('--accent')
        for (let i = 0; i < a.length; i++) if (a[i]) g.fillRect((i % W) * c + .5, Math.floor(i / W) * c + .5, c - 1, c - 1)
      },
      // Click toggles a cell; dragging paints the same state as the first cell got
      touch(x, y, first) {
        if (x < 0 || y < 0 || x >= W || y >= H) return
        const i = Math.floor(y) * W + Math.floor(x)
        if (first) paint = a[i] ^ 1
        if (a[i] !== paint) { a[i] = paint; seen = new Map() }
      },
    }
  })()

  // :lenia - continuous life (Bert Chan, 2019) on a 160x40 torus: cells hold 0..1 and feel a smooth ring
  // of neighbours. Kernel radius 10, growth centred at m = .15 with width s = .015, time step 1/10.
  // Orbium is Chan's R = 13 creature, resampled to R = 10.
  const lenia = (() => {
    const W = 160, H = 40, R = 10, T = 10, m = .15, s = .015, F = 4
    const ORB = [[0,0,0,0,0,0,.1,.14,.1,0,0,.03,.03,0,0,.3,0,0,0,0],[0,0,0,0,0,.08,.24,.3,.3,.18,.14,.15,.16,.15,.09,.2,0,0,0,0],[0,0,0,0,0,.15,.34,.44,.46,.38,.18,.14,.11,.13,.19,.18,.45,0,0,0],[0,0,0,0,.06,.13,.39,.5,.5,.37,.06,0,0,0,.02,.16,.68,0,0,0],[0,0,0,.11,.17,.17,.33,.4,.38,.28,.14,0,0,0,0,0,.18,.42,0,0],[0,0,.09,.18,.13,.06,.08,.26,.32,.32,.27,0,0,0,0,0,0,.82,0,0],[.27,0,.16,.12,0,0,0,.25,.38,.44,.45,.34,0,0,0,0,0,.22,.17,0],[0,.07,.2,.02,0,0,0,.31,.48,.57,.6,.57,0,0,0,0,0,0,.49,0],[0,.59,.19,0,0,0,0,.2,.57,.69,.76,.76,.49,0,0,0,0,0,.36,0],[0,.58,.19,0,0,0,0,0,.67,.83,.9,.92,.87,.12,0,0,0,0,.22,.07],[0,0,.46,0,0,0,0,0,.7,.93,1,1,1,.61,0,0,0,0,.18,.11],[0,0,.82,0,0,0,0,0,.47,1,1,.98,1,.96,.27,0,0,0,.19,.1],[0,0,.46,0,0,0,0,0,.25,1,1,.84,.92,.97,.54,.14,.04,.1,.21,.05],[0,0,0,.4,0,0,0,0,.09,.8,1,.82,.8,.85,.63,.31,.18,.19,.2,.01],[0,0,0,.36,.1,0,0,0,.05,.54,.86,.79,.74,.72,.6,.39,.28,.24,.13,0],[0,0,0,.01,.3,.07,0,0,.08,.36,.64,.7,.64,.6,.51,.39,.29,.19,.04,0],[0,0,0,0,.1,.24,.14,.1,.15,.29,.45,.53,.52,.46,.4,.31,.21,.08,0,0],[0,0,0,0,0,.08,.21,.21,.22,.29,.36,.39,.37,.33,.26,.18,.09,0,0,0],[0,0,0,0,0,0,.03,.13,.19,.22,.24,.24,.23,.18,.13,.05,0,0,0,0],[0,0,0,0,0,0,0,0,.02,.06,.08,.09,.07,.05,.01,0,0,0,0,0]]
    const scale = (p, k) => {
      const n = Math.round(p.length * k), at = (x, y) => (p[y] || [])[x] || 0
      return Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => {
        const sx = x / k, sy = y / k, x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0
        return at(x0, y0) * (1 - fx) * (1 - fy) + at(x0 + 1, y0) * fx * (1 - fy) + at(x0, y0 + 1) * (1 - fx) * fy + at(x0 + 1, y0 + 1) * fx * fy
      }))
    }
    const orb = scale(ORB, R / 13)
    const rot = p => p.map((_, y) => p.map(row => row[y]).reverse())  // quarter turn
    const flip = p => p.map(row => [...row].reverse())
    // milić: the name is a shell (drawn, not simulated) that melts once play starts; three Orbium wait inside M, l and Ć.
    // Any letter matter inside the simulation kills or blows up the school, hence the separate layer.
    let shell = new Float32Array(W * H), melt = 0
    const name = () => {
      const S = 4, word = 'MIlIC', y0 = (H - 5 * S) >> 1, mid = []        // 7 rows of letters plus 2 for the acute, centred
      let x = (W - [...word].reduce((s, c) => s + L[c][0].length + 1, -1) * S) >> 1
      const dot = (px, py) => { for (let a = 0; a < S; a++) for (let b = 0; b < S; b++) shell[(py + a) * W + px + b] = 1 }
      for (const c of word) {
        L[c].forEach((r, y) => [...r].forEach((ch, xx) => ch === '#' && dot(x + xx * S, y0 + y * S)))
        mid.push([x + L[c][0].length * S / 2, y0 + 3.5 * S]); x += (L[c][0].length + 1) * S
      }
      dot(x - 2 * S, y0 - 2 * S); dot(x - 3 * S, y0 - S)               // the acute on Ć
      for (let k = 0; k < 3; k++) {                                     // round the blocks off
        const b = new Float32Array(W * H)
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
          let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += shell[(y + dy) * W + x + dx]
          b[y * W + x] = s / 9
        }
        shell = b
      }
      melt = 1
      return [[rot(orb), mid[0]], [rot(flip(orb)), mid[2]], [rot(orb), mid[4]]].map(([p, [cx, cy]]) => [p, Math.round(cx - p.length / 2), Math.round(cy - p.length / 2)])
    }
    const P = {
      'milić': name,
      'orbium': () => [[orb, 70, 12]],
      'soup': () => Array.from({ length: 4 }, () => [Array.from({ length: 18 }, () => Array.from({ length: 18 }, () => Math.random() < .5 ? Math.random() : 0)),
                                                     Math.floor(Math.random() * W), Math.floor(Math.random() * H)]),
    }
    // Ring kernel: exp(4 - 1/(r(1-r))) for r < 1, normalised to sum 1
    const K = []; let sum = 0
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const r = Math.hypot(dx, dy) / R
      if (r > 0 && r < 1) { const w = Math.exp(4 - 1 / (r * (1 - r))); K.push(dx, dy, w); sum += w }
    }
    for (let j = 2; j < K.length; j += 3) K[j] /= sum
    let A = new Float32Array(W * H)
    const U = new Float32Array(W * H), img = new ImageData(W * F, H * F), off = document.createElement('canvas'), og = off.getContext('2d')
    off.width = W * F; off.height = H * F
    return { W, H, tick: 33, gen: 0, current: 'milić', patterns: Object.keys(P),
      clock: ':t =>', hint: 'click or drag to seed living matter', label: 'Lenia, a continuous Game of Life: the letters MILIĆ melt and Orbium creatures swim out',
      load(p) {
        this.current = p; A = new Float32Array(W * H); shell.fill(0); melt = 0; this.gen = 0
        for (const [rows, x0, y0] of P[p]()) rows.forEach((r, y) => r.forEach((c, x) => { if (c) A[((y0 + y) % H) * W + (x0 + x) % W] = c }))
      },
      // The default start loops too: once the school dies out or grows into a still mesh, show the name again
      over() {
        if (this.current !== 'milić' || this.gen % 50) return false
        const mass = A.reduce((s, v) => s + v, 0)
        return mass < 1 || mass > 600
      },
      step() {
        melt *= .95                                                      // the shell's strokes thin out over about a second
        U.fill(0)
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {        // scatter: empty cells cost nothing
          const c = A[y * W + x]; if (!c) continue
          for (let j = 0; j < K.length; j += 3) U[((y + K[j + 1] + H) % H) * W + (x + K[j] + W) % W] += c * K[j + 2]
        }
        for (let i = 0; i < A.length; i++) {
          if (!U[i] && !A[i]) continue
          const d = U[i] - m
          A[i] = Math.min(1, Math.max(0, A[i] + (2 * Math.exp(-d * d / (2 * s * s)) - 1) / T))
        }
        this.gen++
      },
      // Bilinear at F x, then shade, so edges stay round instead of showing the grid
      render(g, w, h) {
        const [r, gr, b] = rgb(css('--accent')), d = img.data, th = melt > .05 ? .5 + (1 - melt) * .4 : 9
        for (let y = 0; y < H * F; y++) {
          const sy = (y + .5) / F - .5, y0 = Math.floor(sy), fy = sy - y0, r0 = ((y0 + H) % H) * W, r1 = ((y0 + 1) % H) * W
          for (let x = 0; x < W * F; x++) {
            const sx = (x + .5) / F - .5, x0 = Math.floor(sx), fx = sx - x0, c0 = (x0 + W) % W, c1 = (x0 + 1) % W
            const lerp = Z => (Z[r0 + c0] * (1 - fx) + Z[r0 + c1] * fx) * (1 - fy) + (Z[r1 + c0] * (1 - fx) + Z[r1 + c1] * fx) * fy
            const o = (y * W * F + x) * 4
            d[o] = r; d[o + 1] = gr; d[o + 2] = b
            d[o + 3] = 255 * Math.max(smooth(.04, .7, lerp(A)), th < 9 ? smooth(th - .08, th + .08, lerp(shell)) : 0)
          }
        }
        og.putImageData(img, 0, 0)
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'
        g.drawImage(off, 0, 0, w, h)
      },
      touch(x, y) {                                                      // a soft splash of random matter
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
          const q = 1 - (dx * dx + dy * dy) / 16; if (q <= 0) continue
          const i = ((Math.floor(y) + dy + H) % H) * W + (Math.floor(x) + dx + W) % W
          A[i] = Math.min(1, A[i] + q * Math.random() * .8)
        }
      },
    }
  })()

  const cv = root.querySelector('canvas'), g = cv.getContext('2d')
  const gen$ = document.getElementById('gen'), play = document.getElementById('lplay'), pats = document.getElementById('pats')
  const tabs = [...document.querySelectorAll('#lifetabs [role=tab]')], modes = { conway, lenia }
  let sim, running = false, raf = 0, last = 0, acc = 0, timers = []
  const later = (f, ms) => timers.push(setTimeout(f, ms))
  const calm = () => { timers.forEach(clearTimeout); timers = [] }

  function draw() {
    const r = devicePixelRatio || 1, w = cv.clientWidth, h = w * sim.H / sim.W
    if (cv.width !== Math.round(w * r) || cv.height !== Math.round(h * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); cv.style.height = h + 'px' }
    g.setTransform(r, 0, 0, r, 0, 0)
    g.fillStyle = css('--panel'); g.fillRect(0, 0, w, h)
    sim.render(g, w, h)
    gen$.textContent = sim.gen
  }
  function frame(t) {
    raf = 0
    const dt = Math.min(100, t - (last || t)); last = t
    if (running) { acc += dt; while (acc >= sim.tick) { acc -= sim.tick; sim.step() } }
    if (running && sim.over()) { set(false); later(() => { load(sim.current); later(() => set(true), 3000) }, 2000) }
    draw()
    if (running) raf = requestAnimationFrame(frame); else last = 0
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame) }
  function set(on) { running = on; acc = 0; play.textContent = on ? 'pause' : 'play'; kick() }
  function load(p) { calm(); sim.load(p); pats.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.p === p)); kick() }

  function show(mode, first) {
    calm(); set(false)
    sim = modes[mode]
    tabs.forEach(t => { const on = t.dataset.m === mode; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1 })
    root.setAttribute('aria-labelledby', 't-' + mode)
    document.getElementById('clock').textContent = sim.clock
    document.getElementById('hint').textContent = sim.hint
    cv.setAttribute('aria-label', sim.label)
    pats.replaceChildren(...sim.patterns.map(p => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.p = p; b.textContent = p
      b.classList.toggle('on', p === sim.current)
      b.onclick = () => { load(p); if (!still) set(true) }
      return b
    }))
    if (!sim.started) { sim.started = true; load(sim.current) }
    draw()
    if (!still) later(() => set(true), first ? 3000 : 1200)
    if (!first) try { localStorage.setItem('life', mode) } catch {}
  }

  tabs.forEach((t, i) => {
    t.onclick = () => show(t.dataset.m)
    t.onkeydown = e => {                                                 // arrow keys move between tabs
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!k) return
      const n = tabs[(i + k + tabs.length) % tabs.length]; n.focus(); show(n.dataset.m); e.preventDefault()
    }
  })
  play.onclick = () => { calm(); set(!running) }
  document.getElementById('lstep').onclick = () => { calm(); set(false); sim.step(); kick() }
  document.getElementById('lreset').onclick = () => { set(false); load(sim.current); if (!still) later(() => set(true), 2500) }

  const at = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * sim.W, (e.clientY - b.top) / b.height * sim.H] }
  let down = false
  cv.onpointerdown = e => { down = true; sim.touch(...at(e), true); kick(); cv.setPointerCapture(e.pointerId); e.preventDefault() }
  cv.onpointermove = e => { if (down) { sim.touch(...at(e), false); kick() } }
  cv.onpointerup = cv.onpointercancel = () => down = false
  addEventListener('resize', draw)
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw)

  let saved = null; try { saved = localStorage.getItem('life') } catch {}
  show(modes[saved] ? saved : 'lenia', true)
})()

// projects.sparkline: projects running in each year, from projects.json.
;(async () => {
  const el = document.getElementById('spark')
  if (!el) return
  const D = await (await fetch('/projects/projects.json')).json()
  const t = (s, end) => +s.slice(0, 4) + (s.length > 4 ? (s.slice(5, 7) - (end ? 0 : 1)) / 12 : end ? 1 : 0)
  const now = t(D.meta.asOf, true), y0 = Math.min(...D.projects.map(p => Math.floor(t(p.start)))), y1 = Math.floor(now)
  const n = []
  for (let y = y0; y <= y1; y++)
    n.push(D.projects.filter(p => t(p.start) < y + 1 && (p.end ? Math.min(t(p.end, true), now) : now) > y).length)
  const bars = '▁▂▃▄▅▆▇█', max = Math.max(...n)
  n.forEach((v, i) => {
    const s = document.createElement('span')
    s.textContent = bars[v ? Math.max(1, Math.round(v / max * 8)) - 1 : 0]
    if (!v) s.style.opacity = .3
    s.title = `${y0 + i}: ${v} project${v === 1 ? '' : 's'}`
    el.append(s)
  })
  document.getElementById('y0').textContent = y0
  document.getElementById('y1').textContent = y1
  document.getElementById('peak').textContent = `${max} (${y0 + n.indexOf(max)})`
})()
