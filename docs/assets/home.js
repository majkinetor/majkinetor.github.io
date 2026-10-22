// home.js - live cells on the home page: milic.life (the name brought to life eight ways) and the projects sparkline.
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
const still = matchMedia('(prefers-reduced-motion: reduce)').matches

// milic.life: one canvas, eight simulations, each started from the letters MILIĆ and picked by the :pattern buttons.
// Each simulation keeps its own state; the hidden ones pause. The last pick is remembered per visitor.
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
    }
    let a, seen, repeated, paint = 0
    return { W, H, tick: 120, gen: 0, current: 'milić',
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
    return { W, H, tick: 33, gen: 0, current: 'milić',
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

  const rnd = (a, b) => a + Math.random() * (b - a)
  // MILIĆ as a W x H mask, each letter pixel an S x S block, centred, acute included.
  // join fills pixels that touch only at a corner, so outlines have no crossings
  function nameMask(W, H, S, join) {
    const word = 'MIlIC', cols = [...word].reduce((s, c) => s + L[c][0].length + 1, -1), G = Array.from({ length: 10 }, () => new Uint8Array(cols))
    const F = join ? { ...L, C: ['#####', '#...#', '#....', '#....', '#....', '#...#', '#####'] } : L   // a square C wires cleanly
    let gx = 0
    for (const c of word) { F[c].forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && (G[y + 3][gx + x] = 1))); gx += L[c][0].length + 1 }
    G[0][gx - 3] = G[1][gx - 4] = 1                                        // the acute on Ć
    if (join) for (let y = 0; y < 9; y++) for (let x = 0; x < cols; x++) {
      if (x + 1 < cols && G[y][x] && G[y + 1][x + 1] && !G[y][x + 1] && !G[y + 1][x]) G[y + 1][x] = 1
      if (x > 0 && G[y][x] && G[y + 1][x - 1] && !G[y][x - 1] && !G[y + 1][x]) G[y + 1][x] = 1
    }
    const m = new Uint8Array(W * H), x0 = (W - cols * S) >> 1, y0 = (H - 10 * S) >> 1
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const gy = Math.floor((y - y0) / S), gxx = Math.floor((x - x0) / S)
      if (gy >= 0 && gy < 10 && gxx >= 0 && gxx < cols && G[gy][gxx]) m[y * W + x] = 1
    }
    return m
  }
  const field = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d'), new ImageData(W, H)] }

  // :brain - Brian's Brain. on -> dying -> off; an off cell fires with exactly two on neighbours
  function brain() {
    const W = 128, H = 32; let a
    return { W, H, tick: 90, loopAt: 900,
      init() { a = new Uint8Array(W * H); nameMask(W, H, 2).forEach((v, i) => v && (a[i] = 1)) },
      step() {
        const b = new Uint8Array(W * H)
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = y * W + x, s = a[i]
          if (s === 1) b[i] = 2
          else if (s === 0) {
            let n = 0
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
              if ((dx || dy) && a[((y + dy + H) % H) * W + (x + dx + W) % W] === 1) n++
            if (n === 2) b[i] = 1
          }
        }
        a = b
      },
      over() { return !a.includes(1) },
      draw(g, w, c) {
        const k = w / W
        g.fillStyle = c.accent
        for (let i = 0; i < a.length; i++) if (a[i] === 1) g.fillRect((i % W) * k + .5, (i / W | 0) * k + .5, k - 1, k - 1)
        g.globalAlpha = .28
        for (let i = 0; i < a.length; i++) if (a[i] === 2) g.fillRect((i % W) * k + .5, (i / W | 0) * k + .5, k - 1, k - 1)
        g.globalAlpha = 1
      },
    }
  }

  // :coral - Gray-Scott reaction-diffusion (Karl Sims' formulation), coral regime F = .0545, k = .062
  function coral() {
    const W = 384, H = 96, N = W * H, F = .0545, K = .062, Du = 1, Dv = .5
    const [off, og, img] = field(W, H); let u, v, u2, v2
    return { W, H, tick: 33, loopAt: 3000,
      init() {
        u = new Float32Array(N).fill(1); v = new Float32Array(N); u2 = new Float32Array(N); v2 = new Float32Array(N)
        nameMask(W, H, 6).forEach((m, i) => { if (m) { u[i] = .5; v[i] = .25 + Math.random() * .05 } })
      },
      step() {
        for (let it = 0; it < 5; it++) {
          for (let y = 0; y < H; y++) {
            const yu = ((y + H - 1) % H) * W, yc = y * W, yd = ((y + 1) % H) * W
            for (let x = 0; x < W; x++) {
              const xl = (x + W - 1) % W, xr = (x + 1) % W, i = yc + x
              const lu = .2 * (u[yc + xl] + u[yc + xr] + u[yu + x] + u[yd + x]) + .05 * (u[yu + xl] + u[yu + xr] + u[yd + xl] + u[yd + xr]) - u[i]
              const lv = .2 * (v[yc + xl] + v[yc + xr] + v[yu + x] + v[yd + x]) + .05 * (v[yu + xl] + v[yu + xr] + v[yd + xl] + v[yd + xr]) - v[i]
              const r = u[i] * v[i] * v[i]
              u2[i] = u[i] + Du * lu - r + F * (1 - u[i])
              v2[i] = v[i] + Dv * lv + r - (F + K) * v[i]
            }
          }
          ;[u, u2] = [u2, u]; [v, v2] = [v2, v]
        }
      },
      draw(g, w, c, h) {
        const [r, gr, b] = rgb(c.accent), d = img.data
        for (let i = 0; i < N; i++) { const o = i * 4; d[o] = r; d[o + 1] = gr; d[o + 2] = b; d[o + 3] = 255 * Math.min(1, Math.max(0, (v[i] - .08) * 4.5)) }
        og.putImageData(img, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(off, 0, 0, w, h)
      },
    }
  }

  // :neon - Wireworld. The letters' outlines are copper; electrons (head, tail) run round them
  function neon() {
    const W = 144, H = 36; let a
    return { W, H, tick: 70, loopAt: 1200,
      init() {
        const m = nameMask(W, H, 3, true)
        a = new Uint8Array(W * H)
        const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x]
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
          if (m[y * W + x] && !(inside(x - 1, y) && inside(x + 1, y) && inside(x, y - 1) && inside(x, y + 1))) a[y * W + x] = 1
        // Cut each corner whose two neighbours already touch, so every wire cell has exactly two neighbours
        const nb = i => { const x = i % W, y = i / W | 0, r = []
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy
            if ((dx || dy) && xx >= 0 && yy >= 0 && xx < W && yy < H && a[yy * W + xx]) r.push(yy * W + xx) }
          return r }
        for (let cut = true; cut;) {
          cut = false
          for (let i = 0; i < a.length; i++) if (a[i]) {
            const n = nb(i)
            if (n.length === 2 && Math.abs(n[0] % W - n[1] % W) <= 1 && Math.abs((n[0] / W | 0) - (n[1] / W | 0)) <= 1) { a[i] = 0; cut = true }
          }
        }
        const cu = []; for (let i = 0; i < a.length; i++) if (a[i]) cu.push(i)
        cu.sort(() => Math.random() - .5)
        for (const i of cu.slice(0, cu.length / 14 | 0)) {
          if (a[i] !== 1) continue
          const x = i % W, y = i / W | 0, nb = []
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy
            if ((dx || dy) && xx >= 0 && yy >= 0 && xx < W && yy < H && a[yy * W + xx] === 1) nb.push(yy * W + xx)
          }
          if (nb.length) { a[i] = 2; a[nb[Math.random() * nb.length | 0]] = 3 }
        }
      },
      step() {
        const b = a.slice()
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = y * W + x, s = a[i]
          if (s === 2) b[i] = 3
          else if (s === 3) b[i] = 1
          else if (s === 1) {
            let n = 0
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx, yy = y + dy
              if ((dx || dy) && xx >= 0 && yy >= 0 && xx < W && yy < H && a[yy * W + xx] === 2) n++
            }
            if (n === 1 || n === 2) b[i] = 2
          }
        }
        a = b
      },
      over() { return !a.includes(2) },
      draw(g, w, c) {
        const k = w / W, sq = (i, p) => g.fillRect((i % W) * k + p, (i / W | 0) * k + p, k - 2 * p, k - 2 * p)
        g.fillStyle = c.ink; g.globalAlpha = .13
        for (let i = 0; i < a.length; i++) if (a[i]) sq(i, .5)
        g.globalAlpha = 1; g.fillStyle = c.accent
        g.globalAlpha = .45; for (let i = 0; i < a.length; i++) if (a[i] === 3) sq(i, .5)
        g.globalAlpha = 1; g.shadowColor = c.accent; g.shadowBlur = k * 1.5
        for (let i = 0; i < a.length; i++) if (a[i] === 2) sq(i, 0)
        g.shadowBlur = 0
      },
    }
  }

  // :sand - the letters crumble, pile on the floor, then fly back
  function sand() {
    const W = 128, H = 32; let grid, gr, phase, t, quiet
    return { W, H, tick: 55,
      init() {
        grid = new Int32Array(W * H).fill(-1); gr = []; phase = 'fall'; t = 0; quiet = 0
        nameMask(W, H, 2).forEach((m, i) => { if (m) { grid[i] = gr.length; gr.push({ x: i % W, y: i / W | 0, hx: i % W, hy: i / W | 0, d: rnd(0, 30) }) } })
      },
      step() {
        t++
        if (phase === 'fall') {
          let moved = false
          const move = (g, x, y) => { grid[g.y * W + g.x] = -1; g.x = x; g.y = y; grid[y * W + x] = gr.indexOf(g); moved = true }
          for (const g of [...gr].sort((p, q) => q.y - p.y)) {
            if (t < g.d || g.y >= H - 1) continue
            if (grid[(g.y + 1) * W + g.x] === -1) { move(g, g.x, g.y + 1); continue }
            for (const dx of Math.random() < .5 ? [-1, 1] : [1, -1]) {
              const nx = g.x + dx
              if (nx >= 0 && nx < W && grid[(g.y + 1) * W + nx] === -1 && grid[g.y * W + nx] === -1) { move(g, nx, g.y + 1); break }
            }
          }
          quiet = moved || t < 40 ? 0 : quiet + 1
          if (quiet > 35) { phase = 'rise'; t = 0; gr.forEach(g => { g.sx = g.x; g.sy = g.y; g.d = rnd(0, 30) }) }
        } else if (t > 75) this.init()
      },
      draw(g, w, c) {
        const k = w / W, ease = p => p < .5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2
        g.fillStyle = c.accent
        for (const s of gr) {
          let x = s.x, y = s.y
          if (phase === 'rise') { const p = ease(Math.min(1, Math.max(0, (t - s.d) / 40))); x = s.sx + (s.hx - s.sx) * p; y = s.sy + (s.hy - s.sy) * p }
          g.fillRect(x * k + .5, y * k + .5, k - 1, k - 1)
        }
      },
    }
  }

  // :swarm - particles with a home inside a letter: gather, scatter, gather. The pointer pushes them
  function swarm() {
    const W = 160, H = 40, N = 900; let ps, phase, t, pointer = null
    return { W, H, tick: 33, trails: true,
      init() {
        const m = nameMask(W, H, 3), cells = []
        m.forEach((v, i) => v && cells.push(i))
        ps = Array.from({ length: N }, () => {
          const i = cells[Math.random() * cells.length | 0], tx = i % W + Math.random(), ty = (i / W | 0) + Math.random()
          return { x: tx, y: ty, vx: 0, vy: 0, tx, ty }
        })
        phase = 'form'; t = 60
      },
      step() {
        t++
        if (phase === 'form' && t > 150) {
          phase = 'scatter'; t = 0
          for (const p of ps) { const dx = p.x - W / 2, dy = (p.y - H / 2) * 2, d = Math.hypot(dx, dy) || 1, f = rnd(1, 2.6); p.vx += dx / d * f; p.vy += dy / d * f * .5 }
        } else if (phase === 'scatter' && t > 80) { phase = 'form'; t = 0 }
        for (const p of ps) {
          if (phase === 'form') {
            const pull = Math.min(.04, .004 + t * .0004)
            p.vx = (p.vx + (p.tx - p.x) * pull) * .88; p.vy = (p.vy + (p.ty - p.y) * pull) * .88
          } else {
            const ang = Math.sin(p.x * .07 + t * .03) * 2 + Math.cos(p.y * .15 - t * .02) * 2
            p.vx = (p.vx + Math.cos(ang) * .06) * .965; p.vy = (p.vy + Math.sin(ang) * .06) * .965
          }
          if (pointer) {
            const dx = p.x - pointer[0], dy = p.y - pointer[1], d = Math.hypot(dx, dy)
            if (d < 9 && d > .01) { const f = (1 - d / 9) * .9; p.vx += dx / d * f; p.vy += dy / d * f }
          }
          p.x += p.vx; p.y += p.vy
          if (p.x < 0 || p.x > W) { p.vx *= -1; p.x = Math.min(W, Math.max(0, p.x)) }
          if (p.y < 0 || p.y > H) { p.vy *= -1; p.y = Math.min(H, Math.max(0, p.y)) }
        }
      },
      point(x, y) { pointer = x == null ? null : [x, y] },
      draw(g, w, c) {
        const k = w / W, s = Math.max(1.4, k * .38)
        g.fillStyle = c.accent
        for (const p of ps) g.fillRect(p.x * k - s / 2, p.y * k - s / 2, s, s)
      },
    }
  }

  // :ripple - the wave equation on a pond; the name is a breakwater, raindrops fall
  function ripple() {
    const W = 192, H = 48, N = W * H, [off, og, img] = field(W, H); let p, c, n, wall
    const drop = (x, y, amp) => {
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const xx = Math.round(x) + dx, yy = Math.round(y) + dy, q = 1 - (dx * dx + dy * dy) / 9
        if (q > 0 && xx >= 0 && yy >= 0 && xx < W && yy < H && !wall[yy * W + xx]) c[yy * W + xx] += amp * q
      }
    }
    return { W, H, tick: 33,
      init() { p = new Float32Array(N); c = new Float32Array(N); n = new Float32Array(N); wall = nameMask(W, H, 3); drop(W * .2, H * .5, 4); drop(W * .8, H * .3, 4) },
      step() {
        if (Math.random() < .09) drop(rnd(0, W), rnd(0, H), rnd(2, 4))
        for (let it = 0; it < 2; it++) {
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const i = y * W + x
            if (wall[i]) { n[i] = 0; continue }
            const s = (x > 0 ? c[i - 1] : 0) + (x < W - 1 ? c[i + 1] : 0) + (y > 0 ? c[i - W] : 0) + (y < H - 1 ? c[i + W] : 0)
            n[i] = (s / 2 - p[i]) * .992
          }
          ;[p, c, n] = [c, n, p]
        }
      },
      touch(x, y) { drop(x, y, 5) },
      draw(g, w, col, h) {
        const [r, gr, b] = rgb(col.accent), d = img.data
        for (let i = 0; i < N; i++) {
          const o = i * 4; d[o] = r; d[o + 1] = gr; d[o + 2] = b
          d[o + 3] = wall[i] ? 255 : 255 * Math.min(.8, Math.max(0, c[i] * .45))
        }
        og.putImageData(img, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(off, 0, 0, w, h)
      },
    }
  }

  // The newer ones share a smaller interface (init, step, draw); this gives them the runner's
  const wrap = (make, clock, hint, label) => {
    const s = make()
    return { W: s.W, H: s.H, tick: s.tick, trails: s.trails, gen: 0, current: 'milić', clock, hint, label,
      load() { s.init(); this.gen = 0 },
      step() { s.step(); this.gen++ },
      over() { return (s.loopAt && this.gen >= s.loopAt) || !!s.over?.() },
      render(g, w, h) { s.draw(g, w, { accent: css('--accent'), ink: css('--ink') }, h) },
      touch: s.touch && ((x, y, first) => (first || Math.random() < .3) && s.touch(x, y)),
      point: s.point && ((x, y) => s.point(x, y)),
    }
  }
  const kinds = { conway, lenia,
    brain: wrap(brain, ':generation =>', "Brian's Brain: the letters burn out into sparks", "Brian's Brain seeded with the letters MILIĆ"),
    coral: wrap(coral, ':generation =>', 'reaction-diffusion: the name grows into coral', 'Gray-Scott reaction-diffusion growing coral out of the letters MILIĆ'),
    neon: wrap(neon, ':generation =>', 'Wireworld: electrons race round the letters', 'Wireworld: electrons running round the outline of the letters MILIĆ'),
    sand: wrap(sand, ':t =>', 'the letters crumble, then every grain flies home', 'The letters MILIĆ crumble into sand and fly back'),
    swarm: wrap(swarm, ':t =>', 'move the pointer through the swarm', 'A swarm of particles that gathers into the letters MILIĆ'),
    ripple: wrap(ripple, ':t =>', 'click or drag to drop rain', 'Rain on a pond with the letters MILIĆ as a breakwater') }

  const cv = root.querySelector('canvas'), g = cv.getContext('2d')
  const gen$ = document.getElementById('gen'), play = document.getElementById('lplay'), pats = document.getElementById('pats')
  let sim, running = false, raf = 0, last = 0, acc = 0, timers = []
  const later = (f, ms) => timers.push(setTimeout(f, ms))
  const calm = () => { timers.forEach(clearTimeout); timers = [] }

  function draw() {
    const r = devicePixelRatio || 1, w = cv.clientWidth, h = w * sim.H / sim.W
    if (cv.width !== Math.round(w * r) || cv.height !== Math.round(h * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); cv.style.height = h + 'px' }
    g.setTransform(r, 0, 0, r, 0, 0)
    g.globalAlpha = sim.trails && running ? .35 : 1                     // the swarm leaves short trails
    g.fillStyle = css('--panel'); g.fillRect(0, 0, w, h); g.globalAlpha = 1
    sim.render(g, w, h)
    gen$.textContent = sim.gen
  }
  function frame(t) {
    raf = 0
    const dt = Math.min(100, t - (last || t)); last = t
    if (running) { acc += dt; while (acc >= sim.tick) { acc -= sim.tick; sim.step() } }
    if (running && sim.over()) { set(false); later(() => { load(); later(() => set(true), 3000) }, 2000) }
    draw()
    if (running) raf = requestAnimationFrame(frame); else last = 0
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame) }
  function set(on) { running = on; acc = 0; play.textContent = on ? 'pause' : 'play'; kick() }
  function load() { calm(); sim.load(sim.current); kick() }

  function show(kind, first) {
    calm(); set(false)
    sim = kinds[kind]
    pats.querySelectorAll('button').forEach(b => { const on = b.dataset.p === kind; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on) })
    document.getElementById('clock').textContent = sim.clock
    document.getElementById('hint').textContent = sim.hint
    cv.setAttribute('aria-label', sim.label)
    cv.style.cursor = sim.touch ? 'crosshair' : ''
    if (!sim.started) { sim.started = true; sim.load(sim.current) }
    draw()
    if (!still) later(() => set(true), first ? 3000 : 1200)
    if (!first) try { localStorage.setItem('life', kind) } catch {}
  }
  pats.replaceChildren(...Object.keys(kinds).map(k => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.p = k; b.textContent = k
    b.onclick = () => show(k)
    return b
  }))

  play.onclick = () => { calm(); set(!running) }
  document.getElementById('lstep').onclick = () => { calm(); set(false); sim.step(); kick() }
  document.getElementById('lreset').onclick = () => { set(false); load(); if (!still) later(() => set(true), 2500) }

  const at = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * sim.W, (e.clientY - b.top) / b.height * sim.H] }
  let down = false
  cv.onpointerdown = e => { if (!sim.touch) return; down = true; sim.touch(...at(e), true); kick(); cv.setPointerCapture(e.pointerId); e.preventDefault() }
  cv.onpointermove = e => { sim.point?.(...at(e)); if (down) { sim.touch(...at(e), false); kick() } }
  cv.onpointerup = cv.onpointercancel = () => down = false
  cv.onpointerleave = () => sim.point?.(null)
  addEventListener('resize', draw)
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw)

  let saved = null; try { saved = localStorage.getItem('life') } catch {}
  show(kinds[saved] ? saved : 'lenia', true)
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
