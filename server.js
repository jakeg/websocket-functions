import { rpc } from './websockets-rpc.js'
import * as handlers from './handlers.js'

let server = Bun.serve({
  routes: {
    '/ws': (req) => server.upgrade(req, { data: {} })
  },
  websocket: {
    async open (ws) {
      rpc(handlers, ws)
      console.log(await ws.func('addNums', [3, 6]))
    },
    message (ws, message) {
      ws.rpcMessageHandler(message)
    }
  }
})

console.log(`Server listening on ${server.url}`)