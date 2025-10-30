import { rpc, rpcServer } from './websockets-rpc.js'
import * as handlers from './handlers.js'

let server = Bun.serve({
  routes: {
    '/ws': (req) => server.upgrade(req, { data: {} })
  },
  websocket: {
    async open (ws) {
      rpc(handlers, ws, true)
      ws.subscribe('everyone')
      ws.publishProc('everyone', 'coords', { x: 5, y: 10 })
      console.log(await ws.func('addNums', [3, 6]))
    },
    message (ws, message) {
      ws.rpcMessageHandler(message)
      console.log('message', message)
    }
  }
})

rpcServer(server)

setInterval(() => server.publishProc('everyone', 'doThing', [3, 5, 7]), 1_000)

console.log(`Server listening on ${server.url}`)