# WebSocket Functions

```js
let sum = await ws.func('addNums', [3, 5])
```
...and get the return value back over a WebSocket connection.

Abstract away those pesky messages and just invoke remote functions.

Works with Bun (server and clients) and web clients.

Under 3KB. Single file. No dependencies.

## Install

```bash
bun install websocket-functions
```

... or just copy the tiny `index.js` file into your project.

## Quick start

For servers (only Bun currently supported):

```js
import { wsServer } from 'websocket-functions'

// these functions can be called by clients
let handlers = {
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
  let sum = await ws.func('addNums', [3, 5])
  console.log(sum)
}
```

You can also use `ws.proc('funcName', params)` if no return value is needed.

---

Clients can also have handlers which can be called from the server:

```js
import { wsClient } from 'websocket-functions'

// these functions can be called from the server
let handlers = {
  addNums: (nums) => nums.reduce((acc, v) => acc + v, 0)
}

// pass the handlers as the optional 2nd argument to wsClient()
let ws = wsClient(new WebSocket('ws://localhost:3000/ws'), handlers)
```

---

Use Bun's `pub/sub` on the server to run a function on all clients subscribed to a room/channel:

```js
// run on all clients in 'some-room' (excluding ws itself)
ws.publishProc('some-room', 'addNums', [5, 7])

// run on all clients in 'some-room' (including ws itself)
server.publishProc('some-room', 'AddNums', [5, 7])
```

## Bun server with web client example

Put these 3 files in the same folder.

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

## API documentation

Assuming imported with `import * as wsFunc from 'websocket-functions'`.

### `wsFunc.wsClient(ws, handlers = {})`

For usage on WebSocket clients (Bun and web browsers).

Attaches extra methods `proc()` and `func()` to the `WebSocket` object passed as the first argument. Also adds a `message` event listener to handle JSON messages with `{ jsonrpc: '2.0' }` in them.

If attaching your own `message` event listener, do so with `ws.addEventListener('message', func)` rather than `ws.onmessage = func` so as not to override our event listener. You'll probably want to ignore messages with `{ jsonrpc: '2.0' }` in them.

To provide functions which the server can invoke over a WebSocket connection, send an optional second argument being an object of functions.

### `wsFunc.wsServer(serve, handlers, opt)`

For usage with Bun servers.

Starts your Bun server as normal, but with extra methods `proc()`, `func()` and `publishProc()` attached to each WebSocket connection and a `publishProc()` method attached to the server instance. Also adds an additional `message` handler to handle JSON messages with `{ jsonrpc: '2.0' }` in them.

Pass `Bun.serve` as the first argument, an object of functions callable by clients as the second argument, and the normal Bun server configuration options as the third argument. Adds a `websocket` property to Bun's server configuration options if you don't provide one, or adds to yours if you do.

Provide functions which connected WebSocket clients can invoke over a WebSocket connection as the second argument, or an empty `{}` object if none required.

### `handlers` object

An object of functions which can be provided to server or clients which can then be invoked by the other over a WebSocket connection, eg:

```js
let handlers = {
  logMsg: (msg) => console.log('Your message:', msg),
  addNums: (nums) => nums.reduce((acc, v) => acc + v, 0)
}
```

You might chose to put these in a separate file and import them with eg `import * as handlers from './handlers.js'`:

```js
// File: handlers.js

export function logMsg (msg) {
  console.log('Your message', msg)
}

export function addNums (nums) {
  return nums.reduce((acc, v) =. acc + v, 0)
}

export function logName (_, ws) {
  console.log('User is called', ws.data.userName)
}

export function getUserProp (prop, ws) {
  return ws.data.user?.[prop]
}
```

### `handler(params, ws)`

Each handler in your `handlers` object will be called with two parameters:

  - `params` the value provided by eg `ws.proc('funcName', params)`; can be of any type
  - `ws` the WebSocket connection, allowing you to eg get data from it with `ws.data.userName`

If called with `ws.func()` as opposed to `ws.proc()` be sure to provide a `return` value, which will be sent back over the WebSocket connection. If no return value is needed, use `ws.proc()` instead, or you'll be unnecessarily sending an empty response back.

### `ws.proc(method, params)`

When called from the client, will invoke the given `method` on the server, and vice-versa.

Does not receive a return value, unlike `ws.func()`.

### `await ws.func(method, params)`

When called from the client, will invoke the given `method` on the server, and vice-versa.

An asynchronous function which returns a `Promise` which you should `await`. Once the other side of the WebSocket connection has a return value from the function, it will be sent back over the WebSocket connection and the `Promise` will resolve.

Use `ws.proc()` as opposed to `ws.func()` when your method has no return value to prevent an unnecessary message being exchanged.

### `ws.publishProc(room, method, params)`

Only available from servers, uses Bun's `ws.publish()` method to to invoke `method` on all clients subscribed to the `room` channel (other than `ws` themselves). Does not receive a return value.

### `server.publishProc(room, method, params)`

As per `ws.publishProc()`, but for all subscribers to `room` (while `ws.publishProc()` doesn't send to self). `server` is a Bun server object.

## About

Provides an incomplete implementation of [JSON-RPC 2.0](https://www.jsonrpc.org/specification) - exchanges JSON messags over WebSocket connections with property `{ jsonrpc: '2.0' }`.

While HTTP provides _requests_ and associated _responses_, WebSockets only provides _messages_. This modules gives each message a unique `id` so when a message is sent back as a response (to provide a `return` value for a function) it can be associated with the outgoing message.