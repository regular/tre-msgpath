const Value = require('mutant/value')

module.exports = debounce

function debounce({ms}) {
  let timer
  const obs = Value()
  return function(value) {
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout( ()=>{
      timer = undefined
      obs.set(value)
    }, ms || 1000)
    return obs
  }
}

module.exports.register = function(tlc, ssb, config) {
  tlc.registerFilter('debounce', debounce)
}

