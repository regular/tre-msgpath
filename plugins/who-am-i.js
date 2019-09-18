const Value = require('mutant/value')

module.exports = Whoami

function Whoami(ssb) {
  return function(opts) {
    return function() {
      const id = Value()
      ssb.whoami( (err, feed)=>{
        if (err) return obs.set(err)
        id.set(feed.id)
      })
      return id
    }
  }
}

module.exports.register = function(tlc, ssb, config) {
  const whoami = Whoami(ssb, config)
  tlc.registerFilter('who-am-i', whoami)
}

