// home.js - live cells on the home page: Game of Life and the projects sparkline.
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
const still = matchMedia('(prefers-reduced-motion: reduce)').matches

// milic.life: Game of Life seeded from a 5x7 bitmap of MILIĆ.
// Shows the name for a moment, runs until it settles into a loop, then starts over.
;(() => {
  const cv = document.querySelector('#life canvas')
  if (!cv) return
  const F = { M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'], I: ['111', '010', '010', '010', '010', '010', '111'],
              L: ['100', '100', '100', '100', '100', '100', '111'], C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'] }
  const W = 64, H = 16, g = cv.getContext('2d'), gen$ = document.getElementById('gen'), play = document.getElementById('lplay')
  let a, gen, seen, timer, running = false

  function seed() {
    a = new Uint8Array(W * H); gen = 0; seen = new Map()
    const word = ['M', 'I', 'L', 'I', 'C'], width = word.reduce((s, c) => s + F[c][0].length + 1, -1)
    let x0 = (W - width) >> 1; const y0 = 5
    for (const c of word) {
      F[c].forEach((row, y) => [...row].forEach((b, x) => b === '1' && (a[(y0 + y) * W + x0 + x] = 1)))
      x0 += F[c][0].length + 1
    }
    a[(y0 - 3) * W + x0 - 3] = 1; a[(y0 - 2) * W + x0 - 4] = 1   // the acute on Ć
    draw()
  }
  function step() {
    const b = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let n = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
        if (dx || dy) n += a[((y + dy + H) % H) * W + (x + dx + W) % W]
      const i = y * W + x
      b[i] = n === 3 || (n === 2 && a[i]) ? 1 : 0
    }
    a = b; gen++
    const key = a.join('')
    if (seen.has(key) && gen - seen.get(key) < 40) {
      set(false)
      setTimeout(() => { seed(); setTimeout(() => set(true), 3000) }, 2000)
    } else seen.set(key, gen)
    draw()
  }
  function draw() {
    const r = devicePixelRatio || 1, w = cv.clientWidth, c = w / W
    cv.width = w * r; cv.height = c * H * r; cv.style.height = c * H + 'px'
    g.scale(r, r)
    g.fillStyle = css('--panel'); g.fillRect(0, 0, w, c * H)
    g.fillStyle = css('--accent')
    for (let i = 0; i < a.length; i++) if (a[i]) g.fillRect((i % W) * c + .5, Math.floor(i / W) * c + .5, c - 1, c - 1)
    gen$.textContent = gen
  }
  function set(on) {
    running = on; clearInterval(timer)
    if (on) timer = setInterval(step, 160)
    play.textContent = on ? 'pause' : 'play'
  }

  play.onclick = () => set(!running)
  document.getElementById('lstep').onclick = () => { set(false); step() }
  document.getElementById('lreset').onclick = () => seed()
  // Click toggles a cell; dragging paints the same state as the first cell got
  let paint = null
  const cell = e => {
    const c = cv.clientWidth / W, b = cv.getBoundingClientRect()
    const x = Math.floor((e.clientX - b.left) / c), y = Math.floor((e.clientY - b.top) / c)
    return x >= 0 && x < W && y >= 0 && y < H ? y * W + x : -1
  }
  cv.onpointerdown = e => {
    const i = cell(e); if (i < 0) return
    paint = a[i] ^ 1; a[i] = paint; seen = new Map(); draw()
    cv.setPointerCapture(e.pointerId); e.preventDefault()
  }
  cv.onpointermove = e => {
    if (paint === null) return
    const i = cell(e)
    if (i >= 0 && a[i] !== paint) { a[i] = paint; draw() }
  }
  cv.onpointerup = cv.onpointercancel = () => paint = null
  addEventListener('resize', draw)
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  seed()
  if (!still) setTimeout(() => set(true), 3000)
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
