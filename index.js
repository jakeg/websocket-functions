// Simple RPC over WebSockets by Jake Gordon https://github.com/jakeg
// partially conforms to JSON RPC 2.0 spec https://www.jsonrpc.org/specification
export let config = { timeout: 30_000 }

function payload (args) {
  return JSON.stringify({ jsonrpc: '2.0', ...args })
}

export function wsClient (ws, handlers = {}) {
  ws.proc = (method, params) => remoteProc(method, params, ws)
  ws.func = (method, params, timeout) => remoteFunc(method, params, timeout ?? config.timeout, ws)
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
    ws.func = (method, params, timeout) => remoteFunc(method, params, timeout ?? config.timeout, ws)
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
  if (!ws.nextFuncId) ws.nextFuncId = 1
  if (!ws.pendingFuncs) ws.pendingFuncs = {}
  return new Promise((resolve, reject) => {
    let id = ws.nextFuncId++
    let timer = setTimeout(() => {
      if (id in ws.pendingFuncs) {
        delete ws.pendingFuncs[id]
        reject(new Error('remoteFunc() timed out'))
      }
    }, timeout)
    ws.pendingFuncs[id] = {
      resolve: v => {
        clearTimeout(timer)
        resolve(v)
      },
      reject: e => {
        clearTimeout(timer)
        reject(e)
      }
    }
    ws.send(payload({ method, params, id }))
  })
}

async function messageReceived (handlers, message, ws) {
  let jsonrpc, method, params, id, result, error
  try {
    ({ jsonrpc, method, params, id, result, error } = JSON.parse(message))
  } catch { }
  if (jsonrpc) {
    try {
      if (!method && id) {
        // return value from from remote function
        if (id in ws.pendingFuncs) {
          let { resolve, reject } = ws.pendingFuncs[id]
          delete ws.pendingFuncs[id]
          if (error) reject(new Error(error.message))
          else resolve(result)
        }
      } else if (method) {
        if (method in handlers) {
          // run a function (will have an id) or procedure
          try { result = await handlers[method](params, ws) }
          catch (err) {
            if (id) ws.send(payload({ id, error: { code: -32000, message: err.message } }))
          }
          if (id) ws.send(payload({ id, result }))
        } else {
          ws.send(payload({ id, error: { code: -32601, message: 'Method not found' } }))
        }
      }
    } catch (err) {
      console.error('Error processing JSON-RPC message:', message, err)
    }
  }
}