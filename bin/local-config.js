const fs = require('fs')
const {join} = require('path')
const Value = require('mutant/value')
const computed = require('mutant/computed')
const pull = require('pull-stream')
const config = require('rc')('treos-local-config')
const client = require('tre-cli-client')
const Msgpath = require('..')
const debug = require('debug')('treos-local-config')

const sourcefile = config._[0]
if (!sourcefile) {
  console.error(`Usage: ${process.argv[0]} SOURCE [--confg SSB-CONFIG]`)
  process.exit(1)
}

const stack = JSON.parse(fs.readFileSync(sourcefile))

client( (err, ssb)=>{
  bail(err)

  let unsubscribe = x=>{}

  const filters = {}
  const tlc = {
    registerFilter: function(name, f) {
      filters[name] = f
    }
  }

  const pluginNames = 'who-am-i role debounce deref-msg move-file pathway save-blob-to-tmpdir'.split(' ')
  pluginNames.forEach(name=>{
    require(`../plugins/${name}`).register(tlc, ssb, config)
  })

  const fstack = stack.map(filterObj => {
    const filterKeys = Object.keys(filterObj)
    if (filterKeys.length !== 1) throw new Error(`Filter object must have exactly one key: ${filterObj}`)
    const filterName = filterKeys[0]
    const filterOpts = filterObj[filterName]
    const Filter = filters[filterName]
    if (!Filter) throw new Error(`No filter found with name: ${filterName}`)
    return Filter(Object.assign({}, filterOpts)) // TODO: mix-in config?
  })

  /*
  function Extractor(fstack) {
    return function extractor(item, index, options) {
      const extract = fstack[index]
      debug(`Run ${extract} on ${item}`)
      return extract(item)
    }
  }
  */

  const msgpath = Msgpath(ssb)
  const result = msgpath(Value(true), fstack, {defaultExtractor: x=>{throw new Error('No function in fstack')}, obsFromValue: x=>x})
  unsubscribe = result(v=>{
    console.dir(v)
  })

  /*
  process.on('SIGINT', quit)
  process.on('SIGTERM', quit)
  */

  function quit() {
    console.error('\nclosing')
    unsubscribe()
    //drain.abort()
    if (ssb) ssb.close()
  }

  function bail(err) {
    if (err) {
      console.error(err.message)
      quit()
      process.exit(1)
    }
  }
})

