// Mod offline: înregistrarea service worker-ului, descărcarea audio, instalarea aplicației.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { flatLessons, lessons } from './content'
import { audioUrl } from './audio'
import type { Lesson } from './types'

const AUDIO_CACHE = 'audio-v3' // același nume ca în public/sw.js

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* fără offline, dar aplicația merge normal */
    })
  })
}

/** Toate fișierele audio ale unei lecții (aceleași id-uri ca în tools/gen-audio.mjs). */
export function lessonAudioIds(l: Lesson): string[] {
  return [
    ...l.dialog.lines.map((x) => x.id),
    ...l.phrases.map((x) => x.id),
    ...(l.pronunciation?.items.map((x) => x.id) ?? []),
    ...l.grammar.examples.map((_, i) => `g${i + 1}`),
  ]
}

export function allAudioUrls(): string[] {
  return flatLessons
    .filter((l) => lessons[l.id])
    .flatMap((l) => lessonAudioIds(lessons[l.id]).map((id) => new URL(audioUrl(l.id, id), location.href).pathname))
}

export const offlineSupported = () => 'caches' in window && 'serviceWorker' in navigator && import.meta.env.PROD

export async function countCachedAudio(urls = allAudioUrls()): Promise<number> {
  if (!('caches' in window)) return 0
  const cache = await caches.open(AUDIO_CACHE)
  const keys = new Set((await cache.keys()).map((r) => new URL(r.url).pathname))
  return urls.filter((u) => keys.has(u)).length
}

/** Descarcă audio-ul lipsă, câte 6 fișiere în paralel. */
export async function downloadAllAudio(onProgress: (done: number, total: number) => void): Promise<{ failed: number }> {
  const urls = allAudioUrls()
  const cache = await caches.open(AUDIO_CACHE)
  const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname))
  const todo = urls.filter((u) => !have.has(u))
  let done = urls.length - todo.length
  let failed = 0
  onProgress(done, urls.length)
  let i = 0
  const worker = async () => {
    while (i < todo.length) {
      const u = todo[i++]
      try {
        const res = await fetch(u)
        if (res.ok) await cache.put(u, res)
        else failed++
      } catch {
        failed++
      }
      onProgress(++done, urls.length)
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  return { failed }
}

export function useAudioCacheStatus() {
  const [status, setStatus] = useState<{ cached: number; total: number } | null>(null)
  const refresh = () => {
    const urls = allAudioUrls()
    countCachedAudio(urls).then((cached) => setStatus({ cached, total: urls.length }))
  }
  useEffect(refresh, [])
  return { status, refresh, setStatus }
}

// ---------- instalarea ca aplicație (Android / Chrome) ----------

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: InstallEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as InstallEvent
  emit()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  emit()
})

export function useInstallPrompt() {
  const available = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => deferred !== null,
  )
  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    deferred = null
    emit()
  }
  return { available, install }
}

export const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
