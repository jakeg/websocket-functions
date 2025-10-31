// Simple RPC over WebSockets by Jake Gordon https://github.com/jakeg
// partially conforms to JSON RPC 2.0 spec
// https://en.wikipedia.org/wiki/JSON-RPC
// https://www.jsonrpc.org/specification

let nextFuncId = 1
let pendingFuncs = {}

let payload = (args) => JSON.stringify({ jsonrpc: '2.0', ...args })

export function wsClient (ws, handlers = {}) {
  ws.proc = (method, params) => remoteProc(method, params, ws)
  ws.func = (method, params, timeout = 30_000) => remoteFunc(method, params, timeout, ws)
  ws.addEventListener('message', (msg) => messageReceived(handlers, msg.data, ws))
  return ws
}

// returns a Bun server with all the RPC thrown in
export function wsServer (serve, handlers, opt) {
  if (!opt.websocket) opt.websocket = {}
  let origOpen = opt.websocket.open
  let origMessage = opt.websocket.message
  opt.websocket.open = (ws) => {
    ws.proc = (method, params) => remoteProc(method, params, ws)
    ws.func = (method, params, timeout = 30_000) => remoteFunc(method, params, timeout, ws)
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

async function remoteFunc (method, params, timeout, ws) {
  return new Promise ((resolve, reject) => {
    let id = nextFuncId++
    pendingFuncs[id] = { resolve, reject }
    setTimeout(() => {
      if (id in pendingFuncs) {
        delete pendingFuncs[id]
        reject(new Error('remoteFunc() timed out'))
      }
    }, timeout)
    ws.send(payload({ method, params, id }))
  })
}

async function messageReceived (handlers, message, ws) {
  let jsonrpc, method, params, id, result, error
  try {
    ({ jsonrpc, method, params, id, result, error } = JSON.parse(message))
  } catch { }
  if (jsonrpc) {
    if (!method && id) {
      // return value from from remote function
      if (id in pendingFuncs) {
        if (error) pendingFuncs[id]?.reject(new Error(error.message))
        else pendingFuncs[id]?.resolve(result)
        delete pendingFuncs[id]
      }
    } else if (method) {
      if (method in handlers) {
        // run a function or procedure
        let result = handlers[method](params, ws)
        if (result instanceof Promise) result = await result
        if (id) {
          // a function, so send back returned value
          ws.send(payload({ id, result }))
        }
      } else {
        ws.send(payload({ id, error: { code: -32601, message: 'Method not found' } }))
      }
    }
  }
}