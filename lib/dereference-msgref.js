const WatchMerged = require('tre-prototypes')
const Value = require('mutant/value')
const computed = require('mutant/computed')
const {isMsg} = require('ssb-ref')

module.exports = function(ssb) { 
  const watchMerged = WatchMerged(ssb)

  return function obsFromValue(value, opts) {
    opts = opts || {}
    if (typeof value == 'function') return value
    if (isMsg(value)) {
      return computed(watchMerged(value, opts), kv => kv || {})
    }
    return Value(value)
  }
}
