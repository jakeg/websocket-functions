// simple RPC over WebSockets by Jake Gordon https://github.com/jakeg
let nextFuncId = 1
let pendingFuncs = {}
let wrapFunc = (func) => `rpc-${func}`

export function rpc (handlers, ws, server) {
  ws.proc = (func, data) => remoteProc(func, data, ws)
  ws.func = (func, data) => remoteFunc(func, data, ws)
  if (server) {
    ws.rpcMessageHandler = (msg) => messageReceived(handlers, msg, ws)
    ws.publishProc = (room, func, data) => publishProc(room, func, data, ws)
  } else {
    ws.addEventListener('message', (msg) => messageReceived(handlers, msg.data, ws))
  }
}

export function rpcServer (server) {
  server.publishProc = (room, func, data) => publishProc(room, func, data, server)
}

function remoteProc (func, data, ws) {
  ws.send(JSON.stringify({ func: wrapFunc(func), data }))
}

function publishProc (room, func, data, wsOrServer) {
  wsOrServer.publish(room, JSON.stringify({ func: wrapFunc(func), data }))
}

async function remoteFunc (func, data, ws) {
  return new Promise ((resolve) => {
    let rpcId = nextFuncId++
    pendingFuncs[rpcId] = { resolve }
    ws.send(JSON.stringify({ func: wrapFunc(func), data, rpcId }))
  })
}

function messageReceived (handlers, message, ws) {
  let func, data, rpcId, ret
  try {
    ({ func, data, rpcId, ret } = JSON.parse(message))
  } catch {
    console.error(`Non-JSON:`, message)
  }
  if (!func && rpcId) {
    // return value from from remote function
    pendingFuncs[rpcId]?.resolve(ret)
    delete pendingFuncs[rpcId]
  } else if (func) {
    if (!/^rpc-/.test(func)) return
    func = func.replace(/^rpc-/, '')
    if (handlers[func]) {
      // run a function or procedure
      let returned = handlers[func](data, ws)
      if (rpcId) {
        // a function, so send back returned value
        ws.send(JSON.stringify({ rpcId, ret: returned }))
      }
    } else {
      console.error(`No function "${func}"`, message)
    }
  }
}