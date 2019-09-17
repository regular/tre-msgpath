const WatchHeads = require('tre-watch-heads')
const WatchMerged = require('tre-prototypes')
const oll = require('observable-linked-list')
const Value = require('mutant/value')
const MutantArray = require('mutant/array')
const computed = require('mutant/computed')
const debug = require('debug')('tre-msgpath')
const pathway = require('pathway')
const {isMsg} = require('ssb-ref')

module.exports = function(ssb) {
  const watchMerged = WatchHeads(ssb)
  const watchHeads = WatchHeads(ssb)

  return function(obs, path, opts) {
    opts = opts || {}

    const ll = oll(
      computed(obs, value=>{return {value, index: 0}}),
      extractRefs,
      obsFromRefs
    )

    return computed(ll, items => {
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
    })

    function extractRefs(source) {
      if (!Array.isArray(source)) return extractSingle(source)
      let seenIndex
      const result =  source.map(extractSingle).reduce((acc, x) =>{
        if (!x) return acc
        const {refs, index} = x
        if (seenIndex == undefined) seenIndex = index
        if (index !== seenIndex) throw new Error('index mismatch')
        acc.index = index
        acc.refs = acc.refs.concat(refs)
        return acc
      }, {refs: []})
      if (!result.refs.length) return
      return result
    }
    function extractSingle(source) {
      const {value, index} = source
      debug('extract at index %d: %o', index, source)
      const inObjPath = path[index]
      if (!inObjPath || value == null || value == undefined) return
      //debug('source is %o', source)
      debug('extract %o from %o', inObjPath, value)

      let f
      if (Array.isArray(inObjPath)) {
        // it's a pathway path
        f = item => {
          const ret = pathway(item, inObjPath)
          return ret
        }
      } else if (typeof inObjPath == 'function') {
        f = inObjPath
      } else throw new Error(`Unsupported path type: ${typeof inObjsPath}`)
    
      let refs
      if (Array.isArray(value)) {
        debug('mapping %o through %o', value, f)
        refs = value.map(item => {
          return {
            source,
            values: arr(f(item, index, opts))
          }
        })
      } else {
        refs = [{
          source,
          values: arr(f(value, index, opts))
        }]
      }
      debug('extraction result %o', refs.map(r=>r.values))
      return {
        index,
        refs
      }
    }

    function obsFromRefs({refs, index}) {
      debug('obsFromRef %d %o ', index, refs)
      if (refs.length == 1) {
        return r2obs(refs[0], index)
      } else {
        return MutantArray(
          refs.map(r=>r2obs(r, index))
        )
      }
    }

    function r2obs(r, index) {
      debug('r2obs %d %o', index, r)
      index++
      const {source} = r
      return computed(obsFromRef(r), value => {
        if (!Array.isArray(value)) {
          return { value, index, source }
        } 
        return value.map(value =>{
          return { value, index, source }
        })
      })
    }

    function obsFromRef({source, values}) {
      if (values.length == 0) {
        return Value()
      }
      if (values.length == 1) {
        return obsFromValue(values[0])
      } else {
        return MutantArray(values.map(obsFromValue))
      }
    }

    function obsFromValue(value) {
      if (isMsg(value)) {
        return computed(watchMerged(value, opts), kv => kv || {})
      }
      if (typeof value == 'function') return value
      return Value(value)
    }
  }

}

function arr(a) {
  if (a==undefined || a==null) return []
  if (Array.isArray(a)) return a
  return [a]
}
