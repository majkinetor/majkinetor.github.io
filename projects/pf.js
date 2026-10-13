// pf.js - shared helpers for the project timeline mocks.
// No dependencies. Loads projects.json, computes numeric dates, lanes,
// stats and filters; each mock only does presentation.
const PF = (() => {
  const h = (tag, props = {}, ...kids) => {
    const e = document.createElement(tag)
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue
      if (k === 'class') e.className = v
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v)
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v)
      else if (k === 'html') e.innerHTML = v
      else e.setAttribute(k, v)
    }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : String(c))
    return e
  }
  const svg = (tag, attrs = {}) => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag)
    for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v)
    return e
  }

  // "2020" -> 2020.0 (start) or 2021.0 (end); "2020-04" -> 2020.25 / 2020.333
  const num = (s, end = false) => {
    if (!s) return null
    const [y, m] = String(s).split('-').map(Number)
    return m ? y + (m - 1) / 12 + (end ? 1 / 12 : 0) : y + (end ? 1 : 0)
  }

  let D
  async function load(url = 'projects.json') {
    D = await (await fetch(url)).json()
    const now = num(D.meta.asOf, true)
    D.now = now
    for (const p of D.projects) {
      p._s = num(p.start)
      p._ongoing = !p.end
      p._e = Math.min(p.end ? num(p.end, true) : now, now)
      p._live = p.live ? num(p.live) : null
      p._clients = (p.client || []).map(id => ({ id, ...D.orgs[id] }))
      p._kind = p._clients[0]?.kind || 'foss'
      p._carrier = { id: p.carrier, ...D.carriers[p.carrier] }
    }
    D.min = Math.floor(Math.min(...D.projects.map(p => p._s)))
    return D
  }

  const active = (list, t) => list.filter(p => p._s <= t && p._e > t)

  function stats(list = D.projects) {
    let peak = { n: 0, t: 0 }
    for (let t = D.min; t <= D.now; t += 1 / 12) {
      const n = active(list, t).length
      if (n > peak.n) peak = { n, t }
    }
    const gov = new Set(list.flatMap(p => p._clients.filter(c => c.kind === 'gov').map(c => c.id)))
    const byKind = k => list.filter(p => p._kind === k).length
    return {
      total: list.length,
      ongoing: list.filter(p => p._ongoing).length,
      years: Math.floor(D.now - D.min),
      since: D.min,
      peak: { n: peak.n, year: Math.floor(peak.t) },
      institutions: gov.size,
      gov: byKind('gov'), private: byKind('private'), foss: byKind('foss'),
      carriers: new Set(list.map(p => p.carrier)).size,
      projectYears: Math.round(list.reduce((a, p) => a + p._e - p._s, 0)),
    }
  }

  // Active-project count per step from D.min to now
  function series(list = D.projects, step = 1 / 12) {
    const out = []
    for (let t = D.min; t <= D.now + 1e-9; t += step) out.push({ t, n: active(list, t).length })
    return out
  }

  // Greedy interval colouring, newest first: ongoing projects take the leftmost lanes.
  // Optimal lane count for intervals; gap keeps a little air between reused lanes.
  function lanes(list, gap = 0.25) {
    const sorted = [...list].sort((a, b) => b._e - a._e || b._s - a._s)
    const bottoms = []
    for (const p of sorted) {
      let i = bottoms.findIndex(b => b >= p._e + gap)
      if (i < 0) { i = bottoms.length; bottoms.push(0) }
      bottoms[i] = p._s
      p._lane = i
    }
    return bottoms.length
  }

  // Filters: { kind:Set, carrier:Set, q:string }
  const F = { kind: new Set(), carrier: new Set(), q: '' }
  const match = p =>
    (!F.kind.size || F.kind.has(p._kind)) &&
    (!F.carrier.size || F.carrier.has(p.carrier)) &&
    (!F.q || (p.title + ' ' + p.subtitle + ' ' + p.summary + ' ' + (p.tech || []).join(' ') + ' ' + p._clients.map(c => c.name).join(' '))
      .toLowerCase().includes(F.q.toLowerCase()))
  const filtered = () => D.projects.filter(match)

  // Generic chip bar. Mocks restyle .pf-chip / .pf-chip.on
  function chips(el, onChange, { carriers = true, search = false, labels = {} } = {}) {
    const groups = [['kind', Object.entries(D.kinds).map(([k, v]) => [k, v.label, v.color])]]
    if (carriers) groups.push(['carrier', Object.entries(D.carriers).map(([k, v]) => [k, v.name])])
    el.innerHTML = ''
    for (const [key, opts] of groups) {
      const g = h('div', { class: 'pf-group', 'data-key': key },
        labels[key] ? h('span', { class: 'pf-label' }, labels[key]) : null)
      for (const [v, label, color] of opts) {
        const n = D.projects.filter(p => (key === 'kind' ? p._kind : p.carrier) === v).length
        const b = h('button', { class: 'pf-chip', type: 'button', 'data-v': v, style: color ? { '--c': color } : null,
          'aria-pressed': 'false',
          onclick: () => {
            F[key].has(v) ? F[key].delete(v) : F[key].add(v)
            b.classList.toggle('on', F[key].has(v)); b.setAttribute('aria-pressed', F[key].has(v))
            onChange(filtered())
          } }, label, h('span', { class: 'pf-n' }, n))
        g.append(b)
      }
      el.append(g)
    }
    if (search) el.append(h('input', { class: 'pf-q', id: 'pf-q', type: 'search', placeholder: typeof search === 'string' ? search : 'filter: tech, client…',
      oninput: e => { F.q = e.target.value; onChange(filtered()) } }))
  }

  const yr = s => String(s).slice(0, 4)
  const range = p => p._ongoing ? `${yr(p.start)}–now` : yr(p.start) === yr(p.end) ? yr(p.start) : `${yr(p.start)}–${yr(p.end)}`
  const dur = p => { const y = p._e - p._s; return y < 1 ? `${Math.max(1, Math.round(y * 12))}mo` : `${Math.round(y)}y` }
  const url = p => `project.html#${p.id}`
  const color = p => D.kinds[p._kind].color
  const clients = p => p._clients.map(c => c.short || c.name).join(' · ')

  // Monotone map from time to y for row-based (non-linear) axes.
  // rows: [{t, y}] sorted newest first. Times above the first row map toward top.
  function ordinal(rows, top = 0) {
    const pts = [{ t: D.now, y: top }, ...rows]
    return t => {
      if (t >= pts[0].t) return top
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i]
        if (t >= b.t) return b.t === a.t ? b.y : a.y + (b.y - a.y) * (a.t - t) / (a.t - b.t)
      }
      return pts[pts.length - 1].y
    }
  }

  // Row-based lane graph: one row per project (newest start first), an SVG gutter
  // on the left with one vertical line per project, from its end (top) to its row.
  // o: { laneW, minLaneW, maxFrac, pad, anchor, top, row(p), year(y), draw(svg, p, geo) }
  function rowGraph(root, list, o) {
    const n = lanes(list)
    root.innerHTML = ''
    root.classList.add('pf-graph')
    const s = svg('svg', { class: 'pf-svg', 'aria-hidden': 'true' })
    root.append(s)
    const sorted = [...list].sort((a, b) => b._s - a._s || b._e - a._e)
    const rows = []
    let last = null
    for (const p of sorted) {
      const y = Math.floor(p._s)
      if (o.year && y !== last) { root.append(o.year(y)); last = y }
      const r = o.row(p); r.dataset.id = p.id
      root.append(r); rows.push([p, r])
    }
    let busy = false
    const draw = () => {
      if (busy) return
      busy = true
      const lw = Math.max(o.minLaneW ?? 5, Math.min(o.laneW, (root.clientWidth * (o.maxFrac ?? 0.36) - 2 * o.pad) / Math.max(n, 1)))
      const W = Math.round(o.pad * 2 + n * lw)
      if (root.style.getPropertyValue('--gutter') !== W + 'px') root.style.setProperty('--gutter', W + 'px')
      const H = root.scrollHeight
      Object.entries({ viewBox: `0 0 ${W} ${H}`, width: W, height: H }).forEach(([k, v]) => s.setAttribute(k, v))
      s.innerHTML = ''
      const anchor = r => r.offsetTop + (typeof o.anchor === 'function' ? o.anchor(r) : o.anchor)
      const Y = ordinal(rows.map(([p, r]) => ({ t: p._s, y: anchor(r) })), o.top ?? 0)
      for (const [p, r] of rows) {
        const x = o.pad + p._lane * lw + lw / 2
        o.draw(s, p, { x, lw, W, y0: p._ongoing ? (o.top ?? 0) : Y(p._e), y1: anchor(r), yl: p._live ? Y(p._live) : null, row: r })
      }
      busy = false
    }
    requestAnimationFrame(draw)
    if (root._ro) root._ro.disconnect()
    root._ro = new ResizeObserver(() => requestAnimationFrame(draw))
    root._ro.observe(root)
    return { lanes: n, redraw: draw }
  }

  return { h, svg, num, load, rowGraph, stats, series, lanes, chips, filtered, active, range, dur, url, color, clients, ordinal, F, get D() { return D } }
})()
