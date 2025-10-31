import { test, expect } from 'bun:test'
import * as wsFunc from './index.js'

test('end to end', async () => {
  let handlers = {
    addNums: (nums) => nums.reduce((acc, v) => acc + v, 0),
    echo: (str) => str,
    name: (_, ws) => ws.data.name,
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
      resolve()
    }
  })
  ws.close()
  server.stop(true)
  
})