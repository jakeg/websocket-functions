import { test, expect } from 'bun:test'
import * as wsFunc from './index.js'

test('end to end', async () => {
  let handlers = {
    addNums: (nums) => nums.reduce((acc, v) => acc + v, 0),
    echo: (str) => str,
    name: (_, ws) => ws.data.name,
    asyncFunc: async () => 'hi'
  }
  let server = wsFunc.wsServer(Bun.serve, handlers, {
    routes: { '/': (req) => server.upgrade(req, { data: { name: 'Bob' } }) }
  })
  let ws = wsFunc.wsClient(new WebSocket(`ws://${server.url.host}/`))

  await new Promise(resolve => {
    ws.onopen = async () => {
      expect(await ws.func('addNums', [3, 5])).toBe(8)
      expect(await ws.func('addNums', [])).toBe(0)
      expect(await ws.func('echo', 'hello world')).toBe('hello world')
      expect(await ws.func('echo')).toBe(undefined)
      expect(await ws.func('name')).toBe('Bob')
      expect(await ws.func('asyncFunc')).toBe('hi')

      // IMPORTANT:
      // this sleep is needed due to someting I don't fully understand about microtasks
      // took me aaaages to fix
      await Bun.sleep(1)

      await expect(ws.func('missingFunc')).rejects.toThrow('Method not found')

      resolve()
    }
  })
  ws.close()
  server.stop(true)
})

test.only('functions timeout correctly', async () => {
  let timeout = 30
  let handlers = {
    sleeper: async (ms) => {
      await Bun.sleep(ms)
      return 'ok'
    }
  }
  let server = wsFunc.wsServer(Bun.serve, handlers, {
    routes: { '/': (req) => server.upgrade(req, { data: { name: 'Bob' } }) }
  })
  let ws = wsFunc.wsClient(new WebSocket(`ws://${server.url.host}/`))
  await new Promise(resolve => {
    ws.onopen = async () => {
      expect(await ws.func('sleeper', 1, timeout)).toBe('ok')
      await Bun.sleep(1) // as earlier; necessary
      await expect(ws.func('missingFunc', timeout + 5, timeout)).rejects.toThrow('Method not found')
      await Bun.sleep(1) // as earlier; necessary
      await expect(ws.func('sleeper', timeout + 5, timeout)).rejects.toThrow('remoteFunc() timed out')

      // and with configurable timeout
      wsFunc.config.timeout = timeout
      await Bun.sleep(1) // as earlier; necessary
      expect(await ws.func('sleeper', 1)).toBe('ok')
      await Bun.sleep(1) // as earlier; necessary
      await expect(ws.func('sleeper', timeout + 5)).rejects.toThrow('remoteFunc() timed out')
      await Bun.sleep(1) // as earlier; necessary

      timeout = timeout * 2
      wsFunc.config.timeout = timeout
      await Bun.sleep(1) // as earlier; necessary
      expect(await ws.func('sleeper', 1)).toBe('ok')
      await Bun.sleep(1) // as earlier; necessary
      await expect(ws.func('sleeper', timeout + 5)).rejects.toThrow('remoteFunc() timed out')
      await Bun.sleep(1) // as earlier; necessary
      
      resolve()
    }
  })
  ws.close()
  server.stop(true)
})