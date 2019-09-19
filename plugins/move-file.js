const Value = require('mutant/value')
const mv = require('mv')

module.exports.register = function(tlc, ssb, config) {
  tlc.registerAction('move-file', moveFile)

  function moveFile(scope, {from, to, mkdirp, clobber}, rawOpts, cb) {
    if (!to) return cb(new Error('`to` is a required argument for move-file'))
    if (!from) return cb(new Error('`from` is a required argument for move-file'))
    mv(from, to, {mkdirp, clobber}, err=>{
      if (err) return cb(err)
      cb(null, to)
    })
  }
}

