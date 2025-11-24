export default defineNuxtPlugin((nuxtApp) => {
  if (process.server) return

  const listeners: Array<(payload: any) => void> = []
  const addListener = (fn: (p:any)=>void) => { listeners.push(fn); return () => {
    const i = listeners.indexOf(fn); if (i>=0) listeners.splice(i,1)
  } }

  const connect = () => {
    const url = new URL('/api/events/stream/', window.location.origin)
    const es = new EventSource(url.toString(), { withCredentials: true })
    es.addEventListener('asset_ready', (evt: MessageEvent) => {
      try {
        // evt.data may be stringified object; we emitted object directly so eval safe parse
        const data = typeof evt.data === 'string' ? JSON.parse(evt.data) : evt.data
        listeners.forEach(fn => fn(data))
      } catch {
        // ignore
      }
    })
    es.onerror = () => {
      es.close()
      setTimeout(connect, 3000)
    }
  }

  connect()

  nuxtApp.provide('events', { onAssetReady: addListener })
})



