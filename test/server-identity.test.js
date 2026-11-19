import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getConfiguredServerIdentity,
  getDiscoveryInfo,
  getIdentityRuntimeDefaults,
} from '../server/utils/server-identity.js'

test('development defaults preserve the seeded identity and can be overridden', () => {
  assert.deepEqual(getIdentityRuntimeDefaults({}, true), {
    serverId: 'pageantxero-local-server-dev',
    eventId: '7',
  })
  assert.deepEqual(
    getIdentityRuntimeDefaults({
      PAGEANTXERO_SERVER_ID: 'dev-server-2',
      PAGEANTXERO_EVENT_ID: '42',
    }, true),
    { serverId: 'dev-server-2', eventId: '42' },
  )
})

test('production has no development identity fallback', () => {
  assert.deepEqual(getIdentityRuntimeDefaults({}, false), {
    serverId: '',
    eventId: '',
  })
})

test('discovery information returns the configured server and event identity', () => {
  const identity = getConfiguredServerIdentity({
    pageantxero: { serverId: 'server-abc', eventId: '42' },
  }, {})

  assert.deepEqual(getDiscoveryInfo(identity), {
    statusCode: 200,
    body: {
      success: true,
      serverId: 'server-abc',
      eventId: 42,
      protocolVersion: 1,
    },
  })
})

test('discovery information explicitly reports an unassigned server', () => {
  const identity = getConfiguredServerIdentity({
    pageantxero: { serverId: 'server-abc', eventId: '' },
  }, {})

  assert.deepEqual(getDiscoveryInfo(identity), {
    statusCode: 503,
    body: {
      success: false,
      code: 'event_unassigned',
      message: 'This local server is not assigned to an event.',
      serverId: 'server-abc',
      eventId: null,
      protocolVersion: 1,
    },
  })
})

test('missing and malformed identity configuration is rejected', () => {
  assert.deepEqual(
    getConfiguredServerIdentity({ pageantxero: { eventId: '42' } }, {}),
    { status: 'invalid' },
  )
  assert.deepEqual(
    getConfiguredServerIdentity({
      pageantxero: { serverId: 'bad id', eventId: '42' },
    }, {}),
    { status: 'invalid' },
  )
  assert.deepEqual(
    getConfiguredServerIdentity({
      pageantxero: { serverId: 'server-abc', eventId: '0' },
    }, {}),
    { status: 'invalid' },
  )
})

test('invalid identity cannot be mistaken for production development values', () => {
  const identity = getConfiguredServerIdentity({
    pageantxero: getIdentityRuntimeDefaults({}, false),
  }, {})

  assert.deepEqual(getDiscoveryInfo(identity), {
    statusCode: 503,
    body: {
      success: false,
      code: 'server_identity_unavailable',
      message: 'The local server identity is missing or invalid.',
      serverId: null,
      eventId: null,
      protocolVersion: 1,
    },
  })
})

test('production runtime environment overrides Nuxt identity defaults', () => {
  const config = {
    pageantxero: getIdentityRuntimeDefaults({}, false),
  }
  const environment = {
    PAGEANTXERO_SERVER_ID: 'runtime-server',
    PAGEANTXERO_EVENT_ID: '42',
  }
  const identity = getConfiguredServerIdentity(config, environment)

  assert.deepEqual(
    getDiscoveryInfo(identity),
    {
      statusCode: 200,
      body: {
        success: true,
        serverId: 'runtime-server',
        eventId: 42,
        protocolVersion: 1,
      },
    },
  )
})

test('development seed identity remains the fallback without runtime overrides', () => {
  const identity = getConfiguredServerIdentity({
    pageantxero: getIdentityRuntimeDefaults({}, true),
  }, {})

  assert.deepEqual(identity, {
    status: 'assigned',
    serverId: 'pageantxero-local-server-dev',
    eventId: 7,
  })
})

test('runtime environment values still pass identity validation', () => {
  const identity = getConfiguredServerIdentity(
    { pageantxero: { serverId: 'server-default', eventId: '7' } },
    { PAGEANTXERO_SERVER_ID: 'bad id', PAGEANTXERO_EVENT_ID: '0' },
  )

  assert.deepEqual(identity, { status: 'invalid' })
})
