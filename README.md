What if run functions and procedures remotely?

```js
// desired client-side code
let sum = await ws.func('addNums', [2, 3, 4]) // a function with a return value
ws.proc('doThing', 5) // just a procedure with no return value

// desired server-side code
function addNums (nums) {
  return nums.reduce((acc, v) => acc + v, 0)
}
function doThing (num) {
  console.log('The number is', num)
}

// and sending from the server

// to a particular client
let sum = await ws.func('addNums', [2, 3, 4]) // a function with a return value
ws.proc('doThing', 5) // just a procedure with no return value

// also
ws.publish('blah', 'yes')
// assume ws.funcAll not going to be used
server.publish('blah', 'yes')
// becomes
ws.publishProc('blah', 'funcName', 'yes')
server.publishProc('blah', 'yes')
```