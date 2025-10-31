import { wsClient } from 'websocket-functions'
import * as handlers from './handlers.js'

let ws = wsClient(new WebSocket('ws://localhost:3000/ws'), handlers)

ws.onopen = async () => {
  ws.proc('doThing')
  console.log(await ws.func('randomColour', 'blue'))
  ws.send('hello')
  setInterval(() => ws.proc('doThing', 'yes'), 1_000)
}

ws.addEventListener('message', (msg) => {
  // console.log('message', msg.data)
})