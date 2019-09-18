const Dereference = require('../lib/dereference-msgref')

module.exports.register = function(tlc, ssb, config) {
  const dereference = Dereference(ssb)
  tlc.registerFilter('deref-msg', opts => {
    return value => dereference(value, opts)
  })
}
