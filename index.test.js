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

test('functions timeout correctly', async () => {
  let timeout = 50
  let handlers = {
    fastFunc: async () => {
      await Bun.sleep(1)
      return 'ok'
    },
    slowFunc: async () => {
      await Bun.sleep(timeout + 5)
      return 'ok'
    }
  }
  let server = wsFunc.wsServer(Bun.serve, handlers, {
    routes: { '/': (req) => server.upgrade(req, { data: { name: 'Bob' } }) }
  })
  let ws = wsFunc.wsClient(new WebSocket(`ws://${server.url.host}/`))
  await new Promise(resolve => {
    ws.onopen = async () => {
      expect(await ws.func('fastFunc', '', timeout)).toBe('ok')
      await expect(ws.func('slowFunc', '', timeout)).rejects.toThrow('remoteFunc() timed out')
      resolve()
    }
  })
  ws.close()
  server.stop(true)
})