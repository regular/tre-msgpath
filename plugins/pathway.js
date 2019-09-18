const _pathway = require('pathway')

module.exports = pathway

function pathway({path}) {
  return function(value) {
    return _pathway(value, path)
  }
}

module.exports.register = function(tlc, ssb, config) {
  tlc.registerFilter('pathway', pathway)
}

