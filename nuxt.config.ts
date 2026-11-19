import { Bonjour } from 'bonjour-service'
import { createBonjourAdvertiser } from './server/utils/bonjour-advertisement.js'
import { getListeningPort, resolveHttpPort } from './server/utils/server-port.js'
import { getIdentityRuntimeDefaults } from './server/utils/server-identity.js'

const isDevelopment = process.argv.includes('dev')
const identityDefaults = getIdentityRuntimeDefaults(process.env, isDevelopment)
const devServerPort = isDevelopment
  ? resolveHttpPort(process.env, 'development')
  : resolveHttpPort({}, 'production')
let developmentAdvertiser: ReturnType<typeof createBonjourAdvertiser> | undefined

export default defineNuxtConfig({
  runtimeConfig: {
    pageantxero: identityDefaults,
  },
  hooks: {
    async listen(server) {
      if (!isDevelopment) return
      await developmentAdvertiser?.stop()
      developmentAdvertiser = createBonjourAdvertiser({
        serverId: identityDefaults.serverId,
        createBonjour: () => new Bonjour({}, (error) => {
          console.error('[PageantXero mDNS]', error)
        }),
        port: getListeningPort(server),
      })
      developmentAdvertiser.start()
    },
    async close() {
      await developmentAdvertiser?.stop()
      developmentAdvertiser = undefined
    },
  },
  devServer: {
    host: '0.0.0.0',
    port: devServerPort,
  },
})
