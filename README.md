# PageantXero Local Server

A minimal Nuxt 4 HTTP server for local PageantXero communication.

## Setup

Install the project dependencies:

```bash
npm install
```

## Development

Start the server on all network interfaces. Port 3000 is the default:

```bash
npm run dev -- --host 0.0.0.0
```

The Nuxt development server binds to `0.0.0.0`, allowing other devices on the
same local network to connect. Bonjour advertises the actual port reported by
Nuxt after the development HTTP listener starts, including when `--port` or a
port environment variable selects a different port.

For example, set `PORT=43123` to run the development server on port `43123`:

```bash
PORT=43123 npm run dev
```

### Production port

The Nitro Node server listens on `NITRO_PORT`, then `PORT`, and defaults to
`3000`. Bonjour uses the same precedence and waits for that TCP listener before
advertising. Invalid values, including port `0`, stop startup instead of
advertising a guessed port. Set `HOST=0.0.0.0` or `NITRO_HOST=0.0.0.0` to make
the production listener explicitly reachable from the LAN:

```bash
PORT=43123 HOST=0.0.0.0 node .output/server/index.mjs
```

If `NITRO_UNIX_SOCKET` is set, Bonjour startup is rejected because the server
does not have a TCP listening port to advertise.

The Bonjour service type remains `_pageantxero._tcp`. The advertiser polls the
host's available interface addresses every 10 seconds and republishes its
service records when those addresses change. `bonjour-service` itself updates
multicast memberships periodically; the republish refreshes the DNS address
records after a Wi-Fi or DHCP change. Confirm discovery on a physical LAN
because operating-system multicast policy and network client isolation are not
covered by unit tests.

Development uses the explicit seed identity `pageantxero-local-server-dev` and
event ID `7` unless the environment variables below override them.

## API

Check server status:

```bash
curl http://localhost:3000/api/health
```

Check the configured server identity and event assignment:

```bash
curl http://localhost:3000/api/discovery/info
```

The discovery contract is:

```json
{
  "success": true,
  "serverId": "<configured stable server ID>",
  "eventId": 42,
  "protocolVersion": 1
}
```

Set `PAGEANTXERO_SERVER_ID` to a stable identifier for this server and set
`PAGEANTXERO_EVENT_ID` to its assigned positive integer event ID. The event ID
is optional while the server is unassigned. In production, a missing or invalid
server ID returns HTTP 503 with `code: "server_identity_unavailable"`; an
unassigned server returns HTTP 503 with `code: "event_unassigned"`, its
`serverId`, and `eventId: null`. Both responses retain `protocolVersion: 1`.

The endpoint reads identity through `getConfiguredServerIdentity`, separate
from the HTTP response. When a dynamic assignment source is introduced, replace
that configuration reader with the new source and keep the response fields and
error codes unchanged; Flutter can continue using its existing event
repository's expected event ID and validation flow.

Send a ping:

```bash
curl -X POST http://localhost:3000/api/ping \
  -H "Content-Type: application/json" \
  -d '{"message":"Ping!","device":"Test Client"}'
```

An empty POST body is also accepted:

```bash
curl -X POST http://localhost:3000/api/ping
```

Every API request is printed in the terminal running `npm run dev`, for example
`[api] POST /api/ping from 192.168.1.22`.

## Access from another device

Find the host computer's local Wi-Fi IP address; it is assigned by the local
network and is not fixed by this application.

- macOS: run `ipconfig getifaddr en0` in Terminal, then `en1` if that is empty
  (Wi-Fi is not always `en0`).
- Windows: run `ipconfig` and look for the IPv4 address under the active
  wireless adapter.
- Linux: run `ip -4 addr` and find the address on the active Wi-Fi interface.

On a device connected to the same Wi-Fi network, open
`http://<host-local-ip>:<server-port>/api/health`, replacing `<host-local-ip>`
with that address and `<server-port>` with the configured port. The device can
send POST requests to `http://<host-local-ip>:<server-port>/api/ping`. The host
firewall must allow incoming connections on that port.
