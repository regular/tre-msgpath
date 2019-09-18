const Value = require('mutant/value')
const mv = require('mv')

module.exports = moveFile

function moveFile({to, mkdirp, clobber}) {
  if (!to) throw new Error('`to` is a required argument for move-file')
  return function(source) {
    const obs = Value()
    mv(source, to, {mkdirp, clobber}, err =>{
      obs.set(err || to)
    })
    return obs
  }
}

module.exports.register = function(tlc, ssb, config) {
  tlc.registerFilter('move-file', moveFile)
}

