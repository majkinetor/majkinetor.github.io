// stars.js - drifting, twinkling starfield behind the page, with an occasional
// comet and blinking satellite. Stars take the page ink color, so they read as
// white in dark mode and as faint dust in light mode. Stills under reduced motion.
(() => {
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d')
  cv.setAttribute('aria-hidden', 'true')
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none'
  document.body.prepend(cv)

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const DENSITY = 0.0029 // stars per px², about 6000 on a 1080p screen
  let w, h, dpr, stars = [], comet = null, sats = [], driftX = 0, driftY = 0, ink = '255,255,255', alpha = 1
  const rnd = (a, b) => a + Math.random() * (b - a)

  function star(s = {}) {
    const r = Math.random()
    s.x = rnd(0, w); s.y = rnd(0, h)
    s.r = r > .99 ? rnd(1, 2.5) : r > .75 ? rnd(.5, 1.3) : rnd(.3, .7)
    s.life = rnd(60, 180); s.age = -rnd(0, 300); s.max = rnd(.6, 1)
    return s
  }

  function resize() {
    dpr = devicePixelRatio || 1; w = innerWidth; h = innerHeight
    cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const n = Math.min(8000, Math.round(w * h * DENSITY))
    stars.length = Math.min(stars.length, n)
    while (stars.length < n) stars.push(star())
  }

  function theme() {
    const c = getComputedStyle(document.body).color.match(/\d+/g) || [255, 255, 255]
    ink = c.slice(0, 3).join(',')
    alpha = (c[0] * .3 + c[1] * .6 + c[2] * .1) > 128 ? 1 : .35 // light ink = dark page
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

  function frame() {
    ctx.clearRect(0, 0, w, h)
    driftX += .2; driftY += .08

    // Bucket stars by opacity so 6000 stars cost ~20 fills
    const B = 20, paths = Array.from({ length: B }, () => new Path2D())
    for (const s of stars) {
      if (!still && ++s.age > s.life) star(s)
      const o = still ? s.max : glow(s)
      if (o < .05) continue
      const x = ((s.x + driftX) % w + w) % w, y = ((s.y + driftY) % h + h) % h
      const r = s.r * (.5 + .5 * o / s.max)
      const p = paths[Math.min(B - 1, o * B | 0)]
      p.moveTo(x + r, y); p.arc(x, y, r, 0, 7)
    }
    paths.forEach((p, i) => { ctx.fillStyle = `rgba(${ink},${(i + .5) / B * alpha})`; ctx.fill(p) })
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
        ctx.fillStyle = `rgba(${ink},${p * .6 * c.b * alpha})`
        ctx.beginPath(); ctx.arc(x, y, c.r * p * .5, 0, 7); ctx.fill()
      })
      ctx.fillStyle = `rgba(${ink},${c.b * .8 * alpha})`
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
      ctx.fillStyle = s.red ? `rgba(255,40,40,${on ? 1 : .1})` : `rgba(${ink},${(on ? .9 : .1) * alpha})`
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
