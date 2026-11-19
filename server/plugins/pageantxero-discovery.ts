import { createConnection } from 'node:net'
import { Bonjour } from 'bonjour-service'
import { createBonjourAdvertiser, publishWhenReady } from '../utils/bonjour-advertisement.js'
import { resolveHttpPort } from '../utils/server-port.js'

export default defineNitroPlugin((nitroApp) => {
  // Nuxt's development listen hook provides the actual bound port. This plugin
  // owns the production Node server path only.
  if (import.meta.dev) return

  if (process.env.NITRO_UNIX_SOCKET) {
    throw new Error('Bonjour discovery requires a TCP listener; NITRO_UNIX_SOCKET is set.')
  }

  const port = resolveHttpPort(process.env, 'production')
  const advertiser = createBonjourAdvertiser({
    serverId: process.env.PAGEANTXERO_SERVER_ID,
    createBonjour: () => new Bonjour({}, (error) => {
      console.error('[PageantXero mDNS]', error)
    }),
    port,
  })
  const bindHost = process.env.NITRO_HOST || process.env.HOST
  const probeHost = bindHost && bindHost !== '0.0.0.0' && bindHost !== '::'
    ? bindHost
    : '127.0.0.1'

  const stopWaiting = publishWhenReady({
    isReady: () => isTcpListenerReady(probeHost, port),
    onReady: () => advertiser.start(),
  })

  nitroApp.hooks.hook('close', async () => {
    stopWaiting()
    await advertiser.stop()
  })
})

function isTcpListenerReady(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port })
    let settled = false
    const finish = (ready: boolean) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(ready)
    }

    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
    socket.setTimeout(500, () => finish(false))
  })
}
