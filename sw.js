// Service worker: aplicația funcționează și fără internet.
//
// - pagina (index.html): întâi rețeaua (ca să primești actualizările), apoi copia salvată;
// - fișierele aplicației (JS/CSS cu hash în nume, iconițe, manifest): din copia salvată;
// - audio: din copia salvată, altfel din rețea (și se salvează). Cererile cu „Range”
//   (Safari le face pentru audio) primesc răspuns parțial 206 din copia salvată.

const SHELL = 'shell-v1'
const AUDIO = 'audio-v3'
const BASE = new URL('./', self.location).pathname // ex. /deutsch-intensiv/

self.addEventListener('install', (event) => {
  event.waitUntil(cacheShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = [SHELL, AUDIO]
      for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k)
      await self.clients.claim()
    })(),
  )
})

/** Salvează index.html și toate fișierele la care trimite (JS, CSS, iconițe, manifest). */
async function cacheShell(fresh) {
  const cache = await caches.open(SHELL)
  const res = fresh ?? (await fetch(BASE, { cache: 'no-cache' }))
  if (!res.ok) return
  const html = await res.clone().text()
  await cache.put(BASE, res.clone())
  const urls = new Set([`${BASE}manifest.webmanifest`, `${BASE}icons/icon-192.png`, `${BASE}icons/icon-512.png`])
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const u = new URL(m[1], self.location.origin + BASE)
    if (u.origin === self.location.origin) urls.add(u.pathname)
  }
  // fișierele noi le adăugăm; pe cele vechi (din versiuni anterioare) le ștergem
  for (const u of urls) {
    if (!(await cache.match(u))) {
      try {
        await cache.add(u)
      } catch {
        /* ignorăm – se reîncearcă la următoarea deschidere */
      }
    }
  }
  for (const req of await cache.keys()) {
    const p = new URL(req.url).pathname
    if (p !== BASE && p.includes('/assets/') && !urls.has(p)) await cache.delete(req)
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req)
          if (res.ok && url.pathname === BASE) event.waitUntil(cacheShell(res.clone()))
          return res
        } catch {
          return (await caches.match(BASE)) ?? Response.error()
        }
      })(),
    )
    return
  }

  if (url.pathname.startsWith(`${BASE}audio/`) && url.pathname.endsWith('.m4a')) {
    event.respondWith(audioResponse(req, url))
    return
  }

  event.respondWith(
    (async () => {
      const hit = await caches.match(url.pathname)
      if (hit) return hit
      const res = await fetch(req)
      if (res.ok && (url.pathname.includes('/assets/') || url.pathname.includes('/icons/'))) {
        const cache = await caches.open(SHELL)
        cache.put(url.pathname, res.clone())
      }
      return res
    })(),
  )
})

async function audioResponse(req, url) {
  const cache = await caches.open(AUDIO)
  let res = await cache.match(url.pathname)
  if (!res) {
    try {
      const net = await fetch(url.pathname) // fără Range: luăm tot fișierul
      if (!net.ok) return net
      await cache.put(url.pathname, net.clone())
      res = net
    } catch {
      return Response.error()
    }
  }
  const range = req.headers.get('range')
  if (!range) return res
  const buf = await res.arrayBuffer()
  const size = buf.byteLength
  const m = /bytes=(\d*)-(\d*)/.exec(range)
  let start = m && m[1] ? Number(m[1]) : 0
  let end = m && m[2] ? Number(m[2]) : size - 1
  if (m && !m[1] && m[2]) {
    start = Math.max(0, size - Number(m[2]))
    end = size - 1
  }
  end = Math.min(end, size - 1)
  if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mp4',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  })
}
