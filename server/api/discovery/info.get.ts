import {
  getConfiguredServerIdentity,
  getDiscoveryInfo,
} from '../../utils/server-identity.js'

export default defineEventHandler((event) => {
  const identity = getConfiguredServerIdentity(
    useRuntimeConfig(event),
    process.env,
  )
  const response = getDiscoveryInfo(identity)

  if (response.statusCode !== 200) {
    setResponseStatus(event, response.statusCode)
  }

  return response.body
})
