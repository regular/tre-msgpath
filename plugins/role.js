const Msgpath = require('..')
const pull = require('pull-stream')
const collect = require('collect-mutations')
const computed = require('mutant/computed')
const MutantArray = require('mutant/array')

module.exports = Role

function Role(ssb) {
  const msgpath = Msgpath(ssb)
  return function (opts) {
    return function(id) {
      const roles = MutantArray()
      pull(ssb.revisions.messagesByType('role', {live: true, sync: true}), drain = collect(roles, {sync: true}))
    
      const result = msgpath(roles, [
        kv => computed(id, id => kv.value.content.about == id ? kv : null)
      ], {allowAllAuthors: true})

      return computed(result, result => {
        if (!result || !result.length) return
        result = result.slice().sort( (a, b)=>{
          return b[1].value.timestamp - a[1].value.timestamp
        })
        const [all, mine] = result[0]
        return mine
      })
    }
  }
}

module.exports.register = function(tlc, ssb, config) {
  const role = Role(ssb)
  tlc.registerFilter('role', role)
}

