import { RPC } from './websockets-rpc.js'
import * as handlers from './handlers.js'

let ws = new WebSocket('ws://localhost:3000/ws')
let remote = new RPC(handlers, ws)

ws.onopen = async () => {
  remote.proc('doThing')
  console.log(await remote.func('randomColour', 'blue'))
}