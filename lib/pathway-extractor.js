const pathway = require('pathway')

module.exports = function(path) {
  return function(item, index) {
    return pathway(item, path[index])
  }
}
