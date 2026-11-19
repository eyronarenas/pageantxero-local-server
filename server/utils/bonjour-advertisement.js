import { createHash } from 'node:crypto'
import os from 'node:os'

export const BONJOUR_SERVICE_NAME = 'PageantXero Local Server'
export const BONJOUR_SERVICE_TYPE = '_pageantxero._tcp'

/**
 * @param {number} port
 */
export function getBonjourServiceOptions(port, serverId) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Bonjour requires the actual HTTP listening port.')
  }

  const host = serverId
    ? `pageantxero-${createHash('sha256').update(serverId).digest('hex').slice(0, 12)}.local`
    : undefined

  return {
    name: BONJOUR_SERVICE_NAME,
    ...(host ? { host } : {}),
    type: 'pageantxero',
    protocol: 'tcp',
    port,
  }
}

/**
 * Starts one service and refreshes its advertised address records when the
 * available host interfaces change. The caller controls when start() runs.
 *
 * @param {{
 *   createBonjour: () => { publish: (options: object) => { stop: (callback: () => void) => void }, destroy: (callback?: () => void) => void },
 *   port: number,
 *   serverId?: string,
 *   networkInterfaces?: () => Record<string, Array<{ address: string, family: string | number, internal: boolean, mac?: string }> | undefined>,
 *   setIntervalFn?: typeof setInterval,
 *   clearIntervalFn?: typeof clearInterval,
 *   refreshIntervalMs?: number,
 * }} options
 */
export function createBonjourAdvertiser({
  createBonjour,
  port,
  serverId,
  networkInterfaces = os.networkInterfaces,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  refreshIntervalMs = 10_000,
}) {
  const serviceOptions = {
    ...getBonjourServiceOptions(port, serverId),
    txt: { protocolVersion: '1' },
    disableIPv6: true,
  }
  const bonjour = createBonjour()
  let service
  let timer
  let started = false
  let stopped = false
  let refreshing = false
  let pendingRefresh = Promise.resolve()
  let interfaceSignature = getInterfaceSignature(networkInterfaces())

  const start = () => {
    if (stopped) throw new Error('Bonjour advertiser has been stopped.')
    if (service) return service

    started = true
    service = bonjour.publish(serviceOptions)
    if (!timer) {
      timer = setIntervalFn(refreshInterfaces, refreshIntervalMs)
      timer?.unref?.()
    }
    return service
  }

  const refreshInterfaces = () => {
    if (!started || stopped || refreshing) return
    const nextSignature = getInterfaceSignature(networkInterfaces())
    if (nextSignature === interfaceSignature) return

    interfaceSignature = nextSignature
    refreshing = true
    const previousService = service
    service = undefined
    pendingRefresh = new Promise((resolve) => {
      const republish = () => {
        if (!stopped) service = bonjour.publish(serviceOptions)
        refreshing = false
        resolve()
      }

      if (previousService) previousService.stop(republish)
      else republish()
    })
  }

  const stop = async () => {
    if (stopped) return
    stopped = true
    started = false
    if (timer) clearIntervalFn(timer)
    timer = undefined
    await pendingRefresh

    if (service) {
      const activeService = service
      service = undefined
      await new Promise((resolve) => activeService.stop(resolve))
    }
    await new Promise((resolve) => bonjour.destroy(resolve))
  }

  return { start, stop }
}

/**
 * Polls until the HTTP listener is available before publishing Bonjour.
 *
 * @param {{
 *   isReady: () => boolean | Promise<boolean>,
 *   onReady: () => void,
 *   schedule?: typeof setTimeout,
 *   cancel?: typeof clearTimeout,
 *   intervalMs?: number,
 * }} options
 */
export function publishWhenReady({
  isReady,
  onReady,
  schedule = setTimeout,
  cancel = clearTimeout,
  intervalMs = 250,
}) {
  let stopped = false
  let timer

  const check = async () => {
    if (stopped) return
    try {
      if (await isReady()) {
        if (!stopped) onReady()
        return
      }
    } catch {
      // The listener may not have opened its port yet. Retry until shutdown.
    }
    if (!stopped) {
      timer = schedule(() => {
        timer = undefined
        void check()
      }, intervalMs)
      timer?.unref?.()
    }
  }

  void check()

  return () => {
    stopped = true
    if (timer) cancel(timer)
    timer = undefined
  }
}

/**
 * @param {ReturnType<typeof os.networkInterfaces>} interfaces
 */
function getInterfaceSignature(interfaces) {
  const addresses = []
  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.internal || entry.mac === '00:00:00:00:00:00') continue
      addresses.push(name + '/' + entry.family + '/' + entry.address)
    }
  }
  return addresses.sort().join('|')
}
