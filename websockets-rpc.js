export class RPC {
  nextFuncId = 1
  pendingFuncs = {}
  ws

  constructor (handlers, ws) {
    this.handlers = handlers
    if (ws) {
      this.ws = ws
      ws.onmessage = (msg) => this.messageReceived(msg.data)
    }
  }

  // run a remote procedure
  proc (func, data, ws) {
    if (!ws) ws = this.ws
    ws.send(JSON.stringify({ func, data }))
  }

  // run a remote function
  async func (func, data, ws) {
    if (!ws) ws = this.ws
    return new Promise ((resolve) => {
      let id = this.nextFuncId++
      this.pendingFuncs[id] = { resolve }
      ws.send(JSON.stringify({ func, data, id }))
    })
  }

  // handle a message received
  messageReceived (ws, message, ws) {
    if (!ws) ws = this.ws

    let func, data, id, ret
    try {
      ({ func, data, id, ret } = JSON.parse(message))
    } catch {
      console.error(`Non-JSON:`, message)
    }
    if (!func && id) {
      // return value from from remote function
      this.pendingFuncs[id]?.resolve(ret)
      delete this.pendingFuncs[id]
    } else if (func) {
      if (this.handlers[func]) {
        // run a function or procedure
        let returned = this.handlers[func](data, ws)
        if (id) {
          // a function, so send back returned value
          ws.send(JSON.stringify({ id, ret: returned }))
        }
      } else {
        console.error(`No function "${func}"`, message)
      }
    }
  }
}