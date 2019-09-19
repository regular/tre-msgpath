module.exports.register = function(tlc, ssb, config) {
  tlc.registerAction('log', log)

  function log(scope, {priority, message}, rawOpts, cb) {
    if (!message) return cb(new Error('`message` is a required argument for log'))
    console.log(`<${priority|'0'}> ${message}`)
    cb(null, message)
  }
}

