import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BONJOUR_SERVICE_NAME,
  BONJOUR_SERVICE_TYPE,
  createBonjourAdvertiser,
  getBonjourServiceOptions,
  publishWhenReady,
} from '../server/utils/bonjour-advertisement.js'
import {
  DEFAULT_HTTP_PORT,
  getListeningPort,
  resolveHttpPort,
} from '../server/utils/server-port.js'

test('development and production default to the Nuxt HTTP port', () => {
  assert.equal(DEFAULT_HTTP_PORT, 3000)
  assert.equal(resolveHttpPort({}, 'development'), 3000)
  assert.equal(resolveHttpPort({}, 'production'), 3000)
})

test('matches Nuxt and Nitro port environment precedence', () => {
  assert.equal(resolveHttpPort({ PORT: '4321' }, 'production'), 4321)
  assert.equal(
    resolveHttpPort({ NITRO_PORT: '4545', PORT: '4321' }, 'production'),
    4545,
  )
  assert.equal(
    resolveHttpPort(
      { NUXT_PORT: '5001', NITRO_PORT: '4545', PORT: '4321' },
      'development',
    ),
    5001,
  )
})

test('rejects invalid configured ports rather than advertising a fallback', () => {
  for (const port of ['invalid', '0', '65536', '4.5']) {
    assert.throws(
      () => resolveHttpPort({ PORT: port }, 'production'),
      /integer TCP port/,
    )
  }
  assert.throws(() => getBonjourServiceOptions(0), /actual HTTP listening port/)
})

test('uses the actual Nuxt development listener port', () => {
  assert.equal(
    getListeningPort({ address: () => ({ address: '0.0.0.0', port: 4321 }) }),
    4321,
  )
  assert.throws(
    () => getListeningPort({ address: () => null }),
    /not listening on a TCP port/,
  )
})

test('builds the expected Bonjour service type with the resolved port', () => {
  assert.equal(BONJOUR_SERVICE_TYPE, '_pageantxero._tcp')
  assert.deepEqual(getBonjourServiceOptions(3000), {
    name: BONJOUR_SERVICE_NAME,
    type: 'pageantxero',
    protocol: 'tcp',
    port: 3000,
  })
  assert.equal(getBonjourServiceOptions(4321).port, 4321)
})

test('waits until the HTTP listener is ready before publishing', async () => {
  let ready = false
  let publishCount = 0
  const scheduled = []
  const stop = publishWhenReady({
    isReady: () => ready,
    onReady: () => publishCount++,
    schedule: (callback) => {
      scheduled.push(callback)
      return { unref() {} }
    },
    cancel: () => {},
  })

  await Promise.resolve()
  assert.equal(publishCount, 0)
  assert.equal(scheduled.length, 1)

  ready = true
  scheduled.shift()()
  await Promise.resolve()
  await Promise.resolve()
  assert.equal(publishCount, 1)
  stop()
})

test('starts one service, refreshes after interface changes, and closes cleanly', async () => {
  let interfaces = {
    en0: [{ address: '192.168.1.10', family: 'IPv4', internal: false }],
  }
  let intervalCallback
  let clearCount = 0
  let destroyCount = 0
  const publishedOptions = []
  const stoppedServices = []
  const bonjour = {
    publish(options) {
      publishedOptions.push(options)
      const service = {
        stop(callback) {
          stoppedServices.push(service)
          callback()
        },
      }
      return service
    },
    destroy(callback) {
      destroyCount++
      callback()
    },
  }
  const advertiser = createBonjourAdvertiser({
    createBonjour: () => bonjour,
    port: 4321,
    networkInterfaces: () => interfaces,
    setIntervalFn: (callback) => {
      intervalCallback = callback
      return { unref() {} }
    },
    clearIntervalFn: () => clearCount++,
  })

  const first = advertiser.start()
  assert.equal(advertiser.start(), first)
  assert.equal(publishedOptions.length, 1)
  assert.equal(publishedOptions[0].port, 4321)

  interfaces = {
    en1: [{ address: '192.168.2.15', family: 'IPv4', internal: false }],
  }
  intervalCallback()
  assert.equal(stoppedServices.length, 1)
  assert.equal(publishedOptions.length, 2)
  assert.equal(publishedOptions[1].port, 4321)

  await advertiser.stop()
  assert.equal(stoppedServices.length, 2)
  assert.equal(clearCount, 1)
  assert.equal(destroyCount, 1)
})
