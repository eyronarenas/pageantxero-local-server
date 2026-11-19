export const DEFAULT_HTTP_PORT = 3000

/**
 * Mirrors the port precedence used by Nuxt dev and Nitro's Node server.
 *
 * @param {Record<string, string | undefined>} environment
 * @param {'development' | 'production'} mode
 * @returns {number}
 */
export function resolveHttpPort(environment, mode) {
  const keys = mode === 'development'
    ? ['NUXT_PORT', 'NITRO_PORT', 'PORT']
    : ['NITRO_PORT', 'PORT']
  const key = keys.find((candidate) => {
    const value = environment[candidate]
    return value !== undefined && value.trim() !== ''
  })

  if (!key) return DEFAULT_HTTP_PORT

  const rawPort = environment[key].trim()
  if (!/^\d+$/.test(rawPort)) {
    throw new Error(key + ' must be an integer TCP port between 1 and 65535.')
  }

  const port = Number(rawPort)
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error(key + ' must be an integer TCP port between 1 and 65535.')
  }

  return port
}

/**
 * Returns the port reported by the actual Nuxt development listener.
 *
 * @param {{ address: () => string | { port: number } | null }} server
 */
export function getListeningPort(server) {
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Nuxt is not listening on a TCP port.')
  }
  if (!Number.isInteger(address.port) || address.port < 1 || address.port > 65535) {
    throw new Error('Nuxt reported an invalid listening TCP port.')
  }
  return address.port
}
