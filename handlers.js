/*
  IMPORTANT:
  - all these functions can be called remotely
  - they all take (data, ws) as parameters
  - this can be included via client and/or server
  - remember to export any functions you want to use
*/

export function doThing () {
  console.log('doing thing')
}

export function addNums (nums) {
  return nums.reduce((acc, v) => acc + v, 0)
}

export function randomColour () {
  return `hsl(${Math.floor(Math.random() * 360)} 50 50)`
}

export function changeColour (data) {
  return data || randomColour()
}