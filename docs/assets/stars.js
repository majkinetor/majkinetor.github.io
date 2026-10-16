// stars.js - the sky behind the page. Dark theme: drifting, twinkling stars with
// an occasional comet and blinking satellite. Light theme: a printed star atlas,
// grey stars sized by magnitude, constellation lines and a coordinate grid.
// Both drift slowly; still under reduced motion.
(() => {
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d')
  cv.setAttribute('aria-hidden', 'true')
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none'
  document.body.prepend(cv)

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const DENSITY = 0.0029 // stars per px², about 6000 on a 1080p screen
  let w, h, fw = 0, fh = 0, dpr, stars = [], comet = null, sats = [], driftX = 0, driftY = 0
  let dark = true, ink = '255,255,255', accent = '47,111,214', chart = null
  const rnd = (a, b) => a + Math.random() * (b - a)

  function star(s = {}) {
    const r = Math.random()
    s.x = rnd(0, fw); s.y = rnd(0, fh)
    s.r = r > .99 ? rnd(1, 2.5) : r > .75 ? rnd(.5, 1.3) : rnd(.3, .7)
    s.life = rnd(60, 180); s.age = -rnd(0, 300); s.max = rnd(.6, 1)
    return s
  }

  // Atlas for the light theme: few stars, mostly faint, and from the brightest
  // a chain to the nearest unused neighbours makes each constellation
  function atlas() {
    const pts = Array.from({ length: Math.round(fw * fh / 9000) }, () =>
      ({ x: rnd(0, fw), y: rnd(0, fh), r: .6 + Math.random() ** 3 * 2.4 }))
    const lines = [], used = new Set()
    for (const seed of pts.filter(s => s.r > 1.6).slice(0, Math.max(4, pts.length / 12 | 0))) {
      if (used.has(seed)) continue
      let cur = seed; used.add(cur)
      for (let k = 3 + Math.random() * 4 | 0; k > 0; k--) {
        let best = null, bd = 160 * 160
        for (const s of pts) {
          const d = (s.x - cur.x) ** 2 + (s.y - cur.y) ** 2
          if (!used.has(s) && d < bd && d > 900) { bd = d; best = s }
        }
        if (!best) break
        lines.push([cur, best]); used.add(best); cur = best
      }
    }
    return { pts, lines }
  }

  function resize() {
    dpr = devicePixelRatio || 1; w = innerWidth; h = innerHeight
    cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // The sky is a field as tall as the screen, so the mobile address bar showing
    // and hiding (a height change on every scroll reversal) doesn't rebuild it
    if (w === fw && h <= fh) return
    fw = w; fh = Math.max(h, screen.height || 0)
    const n = Math.min(8000, Math.round(fw * fh * DENSITY))
    stars.length = Math.min(stars.length, n)
    while (stars.length < n) stars.push(star())
    chart = atlas()
  }

  const rgb = v => (v.match(/\d+/g) || []).slice(0, 3).join(',')
  function theme() {
    const css = getComputedStyle(document.body)
    ink = rgb(css.color) || ink
    const [r, g, b] = ink.split(',').map(Number)
    dark = r * .3 + g * .6 + b * .1 > 128 // light ink = dark page
    const a = css.getPropertyValue('--accent').trim().match(/^#(..)(..)(..)$/)
    if (a) accent = a.slice(1).map(x => parseInt(x, 16)).join(',')
  }

  // Opacity over a star's life: fade in, hold, fade out, then respawn elsewhere
  const glow = s => {
    if (s.age < 0) return 0
    const p = s.age / s.life
    return s.max * (p < .3 ? p / .3 : p < .8 ? 1 : (1 - p) / .2)
  }

  function mover(edgePad) {
    const side = Math.random() * 4 | 0, a = rnd(-.4, .4)
    const [x, y, ang] = [[rnd(0, w), -edgePad, Math.PI / 2], [-edgePad, rnd(0, h), 0],
      [w + edgePad, rnd(0, h), Math.PI], [rnd(0, w), h + edgePad, -Math.PI / 2]][side]
    return { x, y, ang: ang + a }
  }
  const off = (o, pad) => o.x < -pad || o.x > w + pad || o.y < -pad || o.y > h + pad

  function drawAtlas() {
    const ox = driftX % fw, oy = driftY % fh
    ctx.strokeStyle = `rgba(${ink},.15)`; ctx.lineWidth = 1; ctx.setLineDash([2, 5])
    ctx.beginPath()
    for (let x = ox % 120; x < w; x += 120) { ctx.moveTo(x, 0); ctx.lineTo(x, h) }
    for (let y = oy % 120; y < h; y += 120) { ctx.moveTo(0, y); ctx.lineTo(w, y) }
    ctx.stroke(); ctx.setLineDash([])
    // The sky is one tile; draw it four times so it wraps as it drifts
    for (const [tx, ty] of [[ox, oy], [ox - fw, oy], [ox, oy - fh], [ox - fw, oy - fh]]) {
      ctx.strokeStyle = `rgba(${accent},.35)`; ctx.lineWidth = .8; ctx.beginPath()
      for (const [a, b] of chart.lines) { ctx.moveTo(a.x + tx, a.y + ty); ctx.lineTo(b.x + tx, b.y + ty) }
      ctx.stroke()
      ctx.fillStyle = `rgba(${ink},.45)`; ctx.beginPath()
      for (const s of chart.pts) { ctx.moveTo(s.x + tx + s.r, s.y + ty); ctx.arc(s.x + tx, s.y + ty, s.r, 0, 7) }
      ctx.fill()
    }
  }

  function frame() {
    ctx.clearRect(0, 0, w, h)
    if (!still) { driftX += .2; driftY += .08 }
    if (!dark) return drawAtlas()

    // Bucket stars by opacity so 6000 stars cost ~20 fills
    const B = 20, paths = Array.from({ length: B }, () => new Path2D())
    for (const s of stars) {
      if (!still && ++s.age > s.life) star(s)
      const o = still ? s.max : glow(s)
      if (o < .05) continue
      const x = (s.x + driftX) % fw, y = (s.y + driftY) % fh
      if (y > h) continue
      const r = s.r * (.5 + .5 * o / s.max)
      const p = paths[Math.min(B - 1, o * B | 0)]
      p.moveTo(x + r, y); p.arc(x, y, r, 0, 7)
    }
    paths.forEach((p, i) => { ctx.fillStyle = `rgba(${ink},${(i + .5) / B})`; ctx.fill(p) })
    if (still) return

    if (!comet && Math.random() < 1 / 1350) {
      const m = mover(50), v = rnd(2, 5)
      comet = { ...m, vx: Math.cos(m.ang) * v, vy: Math.sin(m.ang) * v, b: rnd(.4, 1), r: rnd(1.5, 3), tail: [] }
      comet.r *= comet.b
    }
    if (comet) {
      const c = comet
      c.x += c.vx; c.y += c.vy; c.tail.push([c.x, c.y]); if (c.tail.length > 60) c.tail.shift()
      c.tail.forEach(([x, y], i) => {
        const p = i / c.tail.length
        ctx.fillStyle = `rgba(${ink},${p * .6 * c.b})`
        ctx.beginPath(); ctx.arc(x, y, c.r * p * .5, 0, 7); ctx.fill()
      })
      ctx.fillStyle = `rgba(${ink},${c.b * .8})`
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r * .6, 0, 7); ctx.fill()
      if (off(c, 100)) comet = null
    }

    if (Math.random() < 1 / 1900) {
      const m = mover(10), v = rnd(.6, 1.8), red = Math.random() > .3
      sats.push({ ...m, vx: Math.cos(m.ang) * v, vy: Math.sin(m.ang) * v, red, t: 0,
        r: red ? rnd(.9, 1.6) : rnd(.6, 1), every: red ? 8 : 15, blink: red || Math.random() > .5 })
    }
    sats = sats.filter(s => {
      s.x += s.vx; s.y += s.vy; s.t++
      const on = !s.blink || (s.t / s.every | 0) % 2 === 0
      ctx.fillStyle = s.red ? `rgba(255,40,40,${on ? 1 : .1})` : `rgba(${ink},${on ? .9 : .1})`
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill()
      return !off(s, 20)
    })
  }

  let last = 0
  function loop(t) {
    if (t - last > 30) { last = t; if (!document.hidden) frame() } // ~30 fps is plenty
    requestAnimationFrame(loop)
  }

  resize(); theme()
  addEventListener('resize', () => { resize(); if (still) frame() })
  new MutationObserver(() => { theme(); if (still) frame() })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { theme(); if (still) frame() })
  still ? frame() : requestAnimationFrame(loop)
})()
