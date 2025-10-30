import { wsRpcServer } from 'websockets-rpc'
import * as handlers from './handlers.js'

let server = wsRpcServer(Bun.serve, handlers, {
  routes: {
    '/ws': (req) => server.upgrade(req, { data: {} })
  },
  websocket: {
    async open (ws) {
      ws.subscribe('everyone')
      ws.publishProc('everyone', 'coords', { x: 5, y: 10 })
      console.log(await ws.func('addNums', [3, 6]))
    },
    message (ws, message) {
      // console.log('message', message)
    }
  }
})

setInterval(() => server.publishProc('everyone', 'doThing', [3, 5, 7]), 1_000)

console.log(`Server listening on ${server.url}`)