const oll = require('observable-linked-list')
const Value = require('mutant/value')
const MutantArray = require('mutant/array')
const computed = require('mutant/computed')
const debug = require('debug')('tre-msgpath')

const postProcess = require('./lib/post-process')
const defaultExtractor = require('./lib/pathway-extractor')
const Dereference = require('./lib/dereference-msgref')

module.exports = function(ssb) {
  obsFromValue = Dereference(ssb)

  return function(obs, path, opts) {
    opts = opts || {}

    const ll = oll(
      computed(obs, value=>{return {value, index: 0}}),
      extractRefs,
      obsFromRefs
    )
    return computed(ll, postProcess)

    function extractRefs(source) {
      if (!Array.isArray(source)) return extractSingle(source)
      let seenIndex
      const result =  source.map(extractSingle).reduce((acc, x) =>{
        if (nullish(x)) return acc
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
      const pathElement = path[index]
      if (nullish(pathElement) || nullish(value)) return
      //debug('source is %o', source)
      debug('extract %o from %o', pathElement, value)

      const extractor = (typeof pathElement == 'function') ? pathElement : defaultExtractor(path)
    
      let refs
      if (Array.isArray(value)) {
        debug('mapping %o through %o', value, extractor)
        refs = value.map(item => {
          return {
            source,
            values: arr(extractor(item, index, opts))
          }
        })
      } else {
        refs = [{
          source,
          values: arr(extractor(value, index, opts))
        }]
      }
      debug('extraction result %o', refs.map(r=>r.values))
      return { index, refs }
    }

    function obsFromRefs({refs, index}) {
      debug('obsFromRef %d %o ', index, refs)
      if (refs.length == 1) {
        return r2obs(refs[0], index)
      } 
      return MutantArray(refs.map(r=>r2obs(r, index)))
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
      if (values.length == 0) return Value()
      if (values.length == 1) {
        return obsFromValue(values[0], opts)
      }
      return MutantArray(values.map(x => obsFromValue(x, opts)))
    }
  }
}

function arr(a) {
  if (a==undefined || a==null) return []
  if (Array.isArray(a)) return a
  return [a]
}
function nullish(x) {
  return x == null || x == undefined
}
