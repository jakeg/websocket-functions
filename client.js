import { rpc } from './websockets-rpc.js'
import * as handlers from './handlers.js'

let ws = new WebSocket('ws://localhost:3000/ws')
rpc(handlers, ws) // adds .proc .func etc

// let remote = new RPC(handlers, ws)

ws.onopen = async () => {
  ws.proc('doThing')
  console.log(await ws.func('randomColour', 'blue'))
}