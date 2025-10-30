import { rpc } from './websockets-rpc.js'
let ws = new WebSocket('/ws')

let newColour = (colour) => document.body.style.backgroundColor = colour

rpc({ newColour }, ws)

random.onclick = async () => newColour(await ws.func('changeColour'))
green.onclick = async () => newColour(await ws.func('changeColour', 'green'))
clear.onclick = () => ws.proc('clear')
choice.oninput = async () => newColour(await ws.func('changeColour', choice.value))