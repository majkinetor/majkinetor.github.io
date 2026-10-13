# milic.info

Personal site, built by GitHub Pages with Jekyll. Push to `main` and it is live in about a minute.

## Edit a page

- `index.md`: home page
- `about.md`: about page
- `_data/profiles.yml`: the "Where else to find me" links on the about page

Each page starts with a small header, then plain Markdown:

```md
---
title: About
permalink: /about/
---
# Heading

Text, **bold**, [link](https://example.com), lists with `- item`.
```

## Add a page

Create `name.md` with a `title:` header. It is served at `/name.html`, or at the
address given in `permalink:` (for example `permalink: /name/`).

## Other files

- `_layouts/default.html`: the page frame (title, theme switch, breadcrumb)
- `assets/site.css`: styles for the Markdown pages
- `theme.js`: light/dark switch, used by every page
- `projects/`: the projects notebook, plain HTML over `projects.json`

## Preview locally (optional)

```sh
gem install jekyll kramdown-parser-gfm
jekyll serve
```
