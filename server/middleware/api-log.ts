export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/')) return
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  console.log(`[api] ${event.method} ${event.path} from ${ip}`)
})
