# WebSockets RPC

Abstract away WebSockets messages and just call methods (procedures as well as functions which have return values) remotely via RPC (remote procedure call).

Works with Bun (server and clients) and web clients.

For clients (web or Bun):

```js
import { wsRpcClient } from 'websockets-rpc'

// these functions can be called from the server
let handlers = {
  logMsg: (msg) => console.log('Your message:', msg),
  addNums: (nums) => nums.reduce((acc, v) => acc + v, 0)
}

let ws = wsRpcClient(new WebSocket('ws://localhost:3000/ws'), handlers)
```

For servers (only Bun currently supported):

```js
import { wsRpcServer } from 'websockets-rpc'

// these functions can be called by clients
let handlers = {
  logMsg: (msg) => console.log('Your message:', msg),
  addNums: (nums) => nums.reduce((acc, v) => acc + v, 0)
}

let server = wsRpcServer(Bun.serve, handlers, {
  routes: {
    '/ws': (req) => server.upgrade(req)
  }
})
```

---

Make RPC calls from either client or server over a connected WebSocket:

```js
// from a client or the server

// run logMsg() on the other side
ws.proc('logMsg')

// run addNums() on the other side
// ... and get a return value back
let sum = await ws.func('addNums', [5, 7])
console.log(sum)
```

Note that `ws.proc()` runs a _procedure_ and does not receive a return value, while `ws.func()` runs a _function_ and needs to `await` a return value. These methods run on the other side - ie if calling from the server, will run on the client, and vice-versa.

---

Use Bun's `pub/sub` to run a procedure on all clients subscribed to a room/channel:

```js
// run on all clients in 'some-room' (excluding ws itself)
ws.publishProc('some-room', 'addNums', [5, 7])

// run on all clients in 'some-room' (including ws itself)
server.publishProc('some-room', 'AddNums', [5, 7])
```