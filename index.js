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

    return computed(ll, items => items.map(item => item.value))

    function extractRefs({value, index}) {
      const inObjPath = path[index]
      if (!inObjPath || value == null || value == undefined) return

      debug('extract %o from %o', inObjPath, value)

      if (Array.isArray(inObjPath)) {
        // it's a pathway path
        return {
          index,
          refs: pathway(value, inObjPath)
        }
      }
      if (typeof inObjPath == 'function') {
        let obs
        if (Array.isArray(value)) {
          obs = MutantArray(value.map(x=>inObjPath(x, index, opts)))
        } else {
          obs = inObjPath(value, index, opts) 
        }
        return {
          index,
          obs
        }
      }
      throw new Error(`Unsupported path type: ${typeof inObjsPath}`)
    }

    function obsFromRefs({obs, refs, index}) {
      if (!obs) {
        if (refs.length == 1) {
          obs = obsFromRef(refs[0])
        } else {
          obs = MutantArray(refs.map(obsFromRef))
        }
      }
      if (!obs) throw new Error('multiple refs is not implemented')
      return computed(obs, value=>{return {value, index: index + 1}})
    }

    function obsFromRef(ref) {
      if (isMsg(ref)) {
        return computed(watchMerged(ref, opts), kv => kv || {})
      }
      return Value(ref)
    }
  }

}
