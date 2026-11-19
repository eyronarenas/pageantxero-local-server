const SERVER_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

/**
 * Resolves the explicit environment values used as Nuxt runtime config
 * defaults. Development seed identity is intentionally limited to dev mode.
 *
 * @param {Record<string, string | undefined>} environment
 * @param {boolean} isDevelopment
 */
export function getIdentityRuntimeDefaults(environment, isDevelopment) {
  return {
    serverId: environment.PAGEANTXERO_SERVER_ID || (
      isDevelopment ? 'pageantxero-local-server-dev' : ''
    ),
    eventId: environment.PAGEANTXERO_EVENT_ID || (isDevelopment ? '7' : ''),
  }
}

/**
 * Reads the current identity source independently of the discovery endpoint.
 * A future persistent assignment source can replace this function while
 * preserving the endpoint response contract.
 *
 * @param {{ pageantxero?: { serverId?: unknown, eventId?: unknown } }} config
 * @param {Record<string, string | undefined>} environment
 * @returns {{ status: 'invalid' } | { status: 'unassigned', serverId: string } | { status: 'assigned', serverId: string, eventId: number }}
 */
export function getConfiguredServerIdentity(config, environment) {
  const rawServerId = environment.PAGEANTXERO_SERVER_ID ?? config.pageantxero?.serverId
  if (typeof rawServerId !== 'string') return { status: 'invalid' }

  const serverId = rawServerId.trim()
  if (!SERVER_ID_PATTERN.test(serverId)) return { status: 'invalid' }

  const rawEventId = environment.PAGEANTXERO_EVENT_ID ?? config.pageantxero?.eventId
  if (rawEventId === undefined || rawEventId === null || rawEventId === '') {
    return { status: 'unassigned', serverId }
  }

  const eventId = typeof rawEventId === 'number'
    ? rawEventId
    : typeof rawEventId === 'string' && /^\d+$/.test(rawEventId)
      ? Number(rawEventId)
      : Number.NaN

  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    return { status: 'invalid' }
  }

  return { status: 'assigned', serverId, eventId }
}

/**
 * Converts configured identity state into the stable discovery response.
 *
 * @param {ReturnType<typeof getConfiguredServerIdentity>} identity
 */
export function getDiscoveryInfo(identity) {
  if (identity.status === 'invalid') {
    return {
      statusCode: 503,
      body: {
        success: false,
        code: 'server_identity_unavailable',
        message: 'The local server identity is missing or invalid.',
        serverId: null,
        eventId: null,
        protocolVersion: 1,
      },
    }
  }

  if (identity.status === 'unassigned') {
    return {
      statusCode: 503,
      body: {
        success: false,
        code: 'event_unassigned',
        message: 'This local server is not assigned to an event.',
        serverId: identity.serverId,
        eventId: null,
        protocolVersion: 1,
      },
    }
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      serverId: identity.serverId,
      eventId: identity.eventId,
      protocolVersion: 1,
    },
  }
}

