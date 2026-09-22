// Build step for SEO: the app is a single-page React app, so every URL would otherwise ship the
// homepage's <title>, description and canonical until JavaScript runs. After `vite build` this
// writes one HTML file per public page with its own head tags (and, for keyword landing pages,
// the main text and FAQ inside #root so crawlers and link previews see it without JavaScript),
// and generates sitemap.xml from the same data.
import fs from 'node:fs'
import path from 'node:path'
import { PAGE_META } from './src/data/pageMeta.js'
import { landingPages, landingJsonLd } from './src/data/landingPages.js'

const SITE_URL = 'https://bimaone.in'
const EXTRA_SITEMAP_PATHS = ['/privacy-policy', '/terms-and-conditions']

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const setTag = (html, pattern, replacement) => {
  const found = typeof pattern === 'string' ? html.includes(pattern) : pattern.test(html)
  if (!found) throw new Error(`seoPrerender: tag not found in index.html: ${pattern}`)
  return html.replace(pattern, () => replacement)
}

const withHead = (html, { title, description, url, jsonLd }) => {
  let out = html
  out = setTag(out, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  out = setTag(out, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(description)}" />`)
  out = setTag(out, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${esc(url)}" />`)
  out = setTag(out, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${esc(url)}" />`)
  out = setTag(out, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(title)}" />`)
  out = setTag(out, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(description)}" />`)
  out = setTag(out, /<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${esc(title)}" />`)
  out = setTag(out, /<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${esc(description)}" />`)
  if (jsonLd) {
    const json = JSON.stringify(jsonLd).replace(/</g, '\\u003c')
    out = out.replace('</head>', () => `<script type="application/ld+json" data-page-meta="true">${json}</script>\n</head>`)
  }
  return out
}

// Plain crawlable content for a landing page; React replaces it when the app mounts.
const landingBody = (p) => {
  const list = (items) => `<ul>${items.map((i) => `<li><strong>${esc(i.title)}</strong> — ${esc(i.text)}</li>`).join('')}</ul>`
  const related = p.related
    .map((s) => landingPages.find((x) => x.slug === s))
    .filter(Boolean)
    .map((r) => `<a href="/${r.slug}">${esc(r.nav)}</a>`)
    .join(' · ')
  return `<main style="max-width:48rem;margin:0 auto;padding:6rem 1rem 2rem;font-family:sans-serif;color:#1e293b">
<h1>${esc(p.h1)}</h1>
<p>${esc(p.intro)}</p>
<h2>${esc(p.problemsTitle)}</h2>${list(p.problems)}
<h2>${esc(p.featuresTitle)}</h2>${list(p.features)}
<h2>How it works</h2>${list(p.steps)}
<h2>Frequently asked questions</h2>${p.faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}
<p><a href="/login">Start free</a> · <a href="/pricing">Pricing</a> · <a href="/features">All features</a> · ${related}</p>
</main>`
}

const writePage = (outDir, route, html) => {
  const clean = route.replace(/^\//, '')
  const dir = path.join(outDir, clean)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), html)
  // Also /slug.html, for hosts that map /slug to slug.html instead of slug/index.html.
  fs.writeFileSync(path.join(outDir, `${clean}.html`), html)
}

export default function seoPrerender() {
  let outDir
  return {
    name: 'bimaone-seo-prerender',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const template = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8')

      for (const [route, meta] of Object.entries(PAGE_META)) {
        const html = withHead(template, { ...meta, url: `${SITE_URL}${route}` })
        if (route === '/') fs.writeFileSync(path.join(outDir, 'index.html'), html)
        else writePage(outDir, route, html)
      }

      for (const p of landingPages) {
        let html = withHead(template, {
          title: p.title,
          description: p.description,
          url: `${SITE_URL}/${p.slug}`,
          jsonLd: landingJsonLd(p, SITE_URL),
        })
        html = setTag(html, '<div id="root"></div>', `<div id="root">${landingBody(p)}</div>`)
        html = html.replace(/<noscript>[\s\S]*?<\/noscript>\s*/, '')
        writePage(outDir, `/${p.slug}`, html)
      }

      const today = new Date().toISOString().slice(0, 10)
      const entries = [
        ...Object.keys(PAGE_META),
        ...landingPages.map((p) => `/${p.slug}`),
        ...EXTRA_SITEMAP_PATHS,
      ]
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((loc) => `  <url><loc>${SITE_URL}${loc}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml)
      this.info?.(`pre-rendered ${Object.keys(PAGE_META).length + landingPages.length} pages and sitemap.xml (${entries.length} URLs)`)
    },
  }
}
