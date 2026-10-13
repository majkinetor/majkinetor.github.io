// theme.js - light/dark switch shared by all pages.
// Load in <head> so the saved theme applies before first paint.
// Pages style dark mode with :root[data-theme="dark"] and fall back to
// prefers-color-scheme when nothing is saved.
(() => {
  const root = document.documentElement, KEY = 'theme'
  const dark = matchMedia('(prefers-color-scheme: dark)')
  let saved = null
  try { saved = localStorage.getItem(KEY) } catch {}
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved
  const current = () => root.dataset.theme || (dark.matches ? 'dark' : 'light')

  addEventListener('DOMContentLoaded', () => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'theme-toggle'
    const label = () => {
      const next = current() === 'dark' ? 'light' : 'dark'
      b.textContent = next === 'dark' ? '☾' : '☀'
      b.title = b.ariaLabel = `Switch to ${next} theme`
    }
    b.onclick = () => {
      root.dataset.theme = current() === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem(KEY, root.dataset.theme) } catch {}
      label()
    }
    dark.addEventListener('change', label)
    label()
    const css = document.createElement('style')
    css.textContent = `.theme-toggle{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));right:12px;z-index:10;
      width:36px;height:36px;border-radius:50%;border:1px solid color-mix(in srgb,currentColor 25%,transparent);
      background:transparent;color:inherit;font:18px/1 system-ui,sans-serif;cursor:pointer;opacity:.7}
      .theme-toggle:hover{opacity:1}.theme-toggle:focus-visible{outline:2px solid currentColor;outline-offset:2px}`
    document.head.append(css)
    document.body.append(b)
  })
})()
