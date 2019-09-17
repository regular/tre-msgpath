const debug = require('debug')('tre-msgpath: post')

module.exports = function postProcess(items) {
  debug('re-arranging items %o', items)
  return add([], items.slice(-1)[0])

  function add(chain, vs) {
    debug('add: %o to chain: %o', vs, chain)
    //debug('add chain: %o value: %o source: %o', chain, value, source)
    if (Array.isArray(vs)) {
      return vs.reduce( (acc, {value, source}) =>{
        if (value == null || value == undefined) return acc
        const subchain = chain.slice()
        const chains = add(subchain, source)
        chains.forEach(c=>c.push(value))
        acc = acc.concat(chains)
        return acc
      }, [])
    } else {
      const {value, source} = vs
      if (value == null || value == undefined) return
      let chains = [chain]
      if (source) chains = add(chain, source)
      chains.forEach(c=>c.push(value))
      return chains
    }
  }
}
