import { Bonjour } from 'bonjour-service'

export default defineNitroPlugin((nitroApp) => {
  const bonjour = new Bonjour({}, (error) => {
    console.error('[PageantXero mDNS]', error)
  })

  const service = bonjour.publish({
    name: 'PageantXero Local Server',
    type: 'pageantxero',
    protocol: 'tcp',
    port: Number(process.env.PORT || 3000),
  })

  nitroApp.hooks.hook('close', () => {
    service.stop(() => bonjour.destroy())
  })
})
