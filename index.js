// Simple RPC over WebSockets by Jake Gordon https://github.com/jakeg
// partially conforms to JSON RPC 2.0 spec
// https://en.wikipedia.org/wiki/JSON-RPC
// https://www.jsonrpc.org/specification

let nextFuncId = 1
let pendingFuncs = {}

let payload = (args) => JSON.stringify({ jsonrpc: '2.0', ...args })

export function wsRpcClient (ws, handlers) {
  handlers = handlers || {}
  ws.proc = (method, data) => remoteProc(method, data, ws)
  ws.func = (method, data) => remoteFunc(method, data, ws)
  ws.addEventListener('message', (msg) => messageReceived(handlers, msg.data, ws))
  return ws
}

// returns a Bun server with all the RPC thrown in
export function wsRpcServer (serve, handlers, opt) {
  if (!opt.websocket) opt.websocket = {}
  let origOpen = opt.websocket.open
  let origMessage = opt.websocket.message
  opt.websocket.open = (ws) => {
    ws.proc = (method, params) => remoteProc(method, params, ws)
    ws.func = (method, params) => remoteFunc(method, params, ws)
    ws.publishProc = (room, method, params) => publishProc(room, method, params, ws)
    if (origOpen) origOpen(ws)
  }
  opt.websocket.message = (ws, message) => {
    messageReceived(handlers, message, ws)
    if (origMessage) origMessage(ws, message)
  }
  let server = serve(opt)
  server.publishProc = (room, method, params) => publishProc(room, method, params, server)
  return server
}

function remoteProc (method, params, ws) {
  ws.send(payload({ method, params }))
}

function publishProc (room, method, params, wsOrServer) {
  wsOrServer.publish(room, payload({ method, params }))
}

async function remoteFunc (method, params, ws) {
  return new Promise ((resolve) => {
    let id = nextFuncId++
    pendingFuncs[id] = { resolve }
    ws.send(payload({ method, params, id }))
  })
}

function messageReceived (handlers, message, ws) {
  let jsonrpc, method, params, id, result
  try {
    ({ jsonrpc, method, params, id, result } = JSON.parse(message))
  } catch { }
  if (jsonrpc) {
    if (!method && id) {
      // return value from from remote function
      pendingFuncs[id]?.resolve(result)
      delete pendingFuncs[id]
    } else if (method) {
      if (handlers[method]) {
        // run a function or procedure
        let result = handlers[method](params, ws)
        if (id) {
          // a function, so send back returned value
          ws.send(payload({ id, result }))
        }
      } else {
        console.error(`No method "${method}"`, message)
      }
    }
  }
}