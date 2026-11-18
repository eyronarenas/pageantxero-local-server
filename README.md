# PageantXero Local Server

A minimal Nuxt 4 HTTP server for local PageantXero communication.

## Setup

Install the project dependencies:

```bash
npm install
```

## Development

Start the server on all network interfaces at port 3000:

```bash
npm run dev -- --host 0.0.0.0
```

The Nuxt development server is configured to bind to `0.0.0.0:3000`, allowing
other devices on the same local network to connect.

## API

Check server status:

```bash
curl http://localhost:3000/api/health
```

Check discovery information for the development event (`eventId: 7`):

```bash
curl http://localhost:3000/api/discovery/info
```

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
`http://<host-local-ip>:3000/api/health`, replacing `<host-local-ip>` with that
address. The device can send POST requests to
`http://<host-local-ip>:3000/api/ping`. The host firewall must allow incoming
connections on port 3000.
