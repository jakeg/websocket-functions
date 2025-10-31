# WebSocket Functions

Abstract away WebSockets messages and just call methods (procedures as well as functions which have return values) remotely via RPC (remote procedure call).

Works with Bun (server and clients) and web clients.

## Install

```bash
bun install websocket-functions
```

## Quick start

For servers (only Bun currently supported):

```js
import { wsServer } from 'websocket-functions'

// these methods can be called by clients
let handlers = {
  logMsg: (msg) => console.log('Your message:', msg),
  addNums: (nums) => nums.reduce((acc, v) => acc + v, 0)
}

let server = wsServer(Bun.serve, handlers, {
  routes: {
    '/ws': (req) => server.upgrade(req),
    // ... other routes
  }
})

console.log(`Server listening at ${server.url}`)
```

---

For clients (web or Bun):

```js
import { wsClient } from 'websocket-functions'

let ws = wsClient(new WebSocket('ws://localhost:3000/ws'))

ws.onopen = async () => {

  // run a procedure that doesn't have a return value
  ws.proc('logMsg', 'From client, running on server')

  // run a function and do something with the value returned
  console.log(await ws.func('addNums', [3, 5]))
}
```

Note that `ws.proc()` runs a _procedure_ and does not receive a return value, while `ws.func()` runs a _function_ and needs to `await` a return value.

---

Clients can also have handlers which can be called from the server:

```js
import { wsClient } from 'websocket-functions'

// these functions can be called from the server
let handlers = {
  logMsg: (msg) => console.log('Your message:', msg),
  addNums: (nums) => nums.reduce((acc, v) => acc + v, 0)
}

// pass the handlers as the optional 2nd argument to wsRpcClient()
let ws = wsClient(new WebSocket('ws://localhost:3000/ws'), handlers)
```

---

Use Bun's `pub/sub` on the server to run a procedure on all clients subscribed to a room/channel:

```js
// run on all clients in 'some-room' (excluding ws itself)
ws.publishProc('some-room', 'addNums', [5, 7])

// run on all clients in 'some-room' (including ws itself)
server.publishProc('some-room', 'AddNums', [5, 7])
```

# Bun server with web client example

Put these 3 files in the same folder

`server.js`:
```js
import { wsServer } from 'websocket-functions'
import clientPage from './client.html'

// these functions can be called by clients
let handlers = {
  logMsg: (msg) => console.log('Your message:', msg),
  addNums: (nums) => nums.reduce((acc, v) => acc + v, 0)
}

let server = wsServer(Bun.serve, handlers, {
  routes: {
    '/': clientPage,
    '/ws': (req) => server.upgrade(req)
  }
})

console.log(`Server listening at ${server.url}`)
```

`client.html`:
```html
<!doctype html>
<title>Example RPC client</title>
<style>pre { display: inline; background: #eee; padding: 5px; }</style>
<div>Try eg <pre>ws.proc('logMsg', 'Hello world')</pre> or <pre>await ws.func('addNums', [3, 5])</pre> in the console.</div>
<script type="module" src="client.js"></script>
```

`client.js`:
```js
import { wsClient } from 'websocket-functions'

globalThis.ws = wsClient(new WebSocket('ws://localhost:3000/ws'))

ws.onopen = async () => {

  // run a procedure that doesn't have a return value
  ws.proc('logMsg', 'From client, running on server')

  // run a function and do something with the value returned
  console.log(await ws.func('addNums', [3, 5]))
}
```

Start the server with `bun server.js` then open in a browser and in the developer tools console run eg `await ws.func('addNums', [3, 5])`.