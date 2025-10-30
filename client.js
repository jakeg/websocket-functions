import { rpc } from './websockets-rpc.js'
import * as handlers from './handlers.js'

let ws = new WebSocket('ws://localhost:3000/ws')
rpc(handlers, ws) // adds .proc .func, handles messages etc

ws.onopen = async () => {
  ws.proc('doThing')
  console.log(await ws.func('randomColour', 'blue'))
}