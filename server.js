import { RPC } from './websockets-rpc.js'
import * as handlers from './handlers.js'

let remote = new RPC(handlers)

let server = Bun.serve({
  routes: {
    '/ws': (req) => server.upgrade(req, { data: {} })
  },
  websocket: {
    async open (ws) {
      ws.func = (func, data) => remote.func(func, data, ws)
      ws.proc = (func, data) => remote.proc(func, data, ws)
      console.log(await ws.func('addNums', [3, 6]))
    },
    message (ws, message) {
      remote.messageReceived(message, ws)
    }
  }
})

console.log(`Server listening on ${server.url}`)