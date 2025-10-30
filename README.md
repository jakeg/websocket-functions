What if run functions and procedures remotely?

On the client:

```js
import { rpc } from './websockets-rpc.js'
// import * as handlers from './handlers.js' // suggest importing handlers

let handlers = {
  doThing: (data) => console.log('hello', data)
}

let ws = new WebSocket('ws://localhost:3000/ws')
rpc(handlers, ws) // adds .proc .func, handles messages etc

ws.onopen = async () => {

  // runs procedure doThing() on server
  ws.proc('doThing')

  // runs function randomColour() on server, and gets returned value
  console.log(await ws.func('randomColour', 'blue'))

}

// can still bind other message handlers (ignore ones starting "rpc-")
ws.addEventListener('message', (msg) => {
  console.log('message', msg.data)
})
```

And on the server:

```js
import { rpc, rpcServer } from './websockets-rpc.js'
// import * as handlers from './handlers.js' // suggest importing handlers

let handlers = {
  doThing: (data) => console.log('hello', data)
}

let server = Bun.serve({
  routes: {
    '/ws': (req) => server.upgrade(req, { data: {} })
  },
  websocket: {
    async open (ws) {
      rpc(handlers, ws, true) // need this
      ws.subscribe('everyone')
      ws.publishProc('everyone', 'coords', { x: 5, y: 10 })
      console.log(await ws.func('addNums', [3, 6]))
    },
    message (ws, message) {
      ws.rpcMessageHandler(message) // also need this
      console.log('message', message)
    }
  }
})

rpcServer(server) // also need this

setInterval(() => server.publishProc('everyone', 'doThing', [3, 5, 7]), 1_000)

console.log(`Server listening on ${server.url}`)
```