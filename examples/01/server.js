import { rpc, rpcServer } from './websockets-rpc.js'
import coloursPage from './colours.html'

let handlers = {
  changeColour: (data) => data || randomColour(),
  clear: (data, ws) => clearInterval(ws.data.interval)
}

let server = Bun.serve({
  routes: {
    '/': coloursPage,
    '/ws': (req) => server.upgrade(req, { data: {} })
  },
  websocket: {
    open (ws) {
      rpc(handlers, ws, true)
      ws.proc('newColour', randomColour())
      ws.data.interval = setInterval(() => ws.proc('newColour', randomColour()), 1_000)
    },
    message (ws, message) {
      ws.rpcMessageHandler(message)
    }
  }
})

console.log(`Server listening on ${server.url}`)

function randomColour () {
  return `hsl(${Math.floor(Math.random() * 360)} 50 50)`
}