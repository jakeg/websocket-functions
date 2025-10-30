let nextFuncId = 1
let pendingFuncs = {}

export function rpc (handlers, ws) {
  ws.proc = (func, data) => remoteProc(func, data, ws)
  ws.func = (func, data) => remoteFunc(func, data, ws)
  ws.onmessage = (msg) => messageReceived(handlers, msg.data, ws)
  ws.rpcMessageHandler = (msg) => messageReceived(handlers, msg, ws)
}

function remoteProc (func, data, ws) {
  ws.send(JSON.stringify({ func, data }))
}

async function remoteFunc (func, data, ws) {
  return new Promise ((resolve) => {
    let id = nextFuncId++
    pendingFuncs[id] = { resolve }
    ws.send(JSON.stringify({ func, data, id }))
  })
}

// handle a message received
function messageReceived (handlers, message, ws) {
  let func, data, id, ret
  try {
    ({ func, data, id, ret } = JSON.parse(message))
  } catch {
    console.error(`Non-JSON:`, message)
  }
  if (!func && id) {
    // return value from from remote function
    pendingFuncs[id]?.resolve(ret)
    delete pendingFuncs[id]
  } else if (func) {
    if (handlers[func]) {
      // run a function or procedure
      let returned = handlers[func](data, ws)
      if (id) {
        // a function, so send back returned value
        ws.send(JSON.stringify({ id, ret: returned }))
      }
    } else {
      console.error(`No function "${func}"`, message)
    }
  }
}