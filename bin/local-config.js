const fs = require('fs')
const {join} = require('path')
const Value = require('mutant/value')
const computed = require('mutant/computed')
const pull = require('pull-stream')
const config = require('rc')('treos-local-config')
const client = require('tre-cli-client')
const Msgpath = require('..')
const debug = require('debug')('treos-local-config')
const htime = require('human-time')

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
    const label = filterObj.label
    delete filterObj.label
    const filterKeys = Object.keys(filterObj)
    if (filterKeys.length !== 1) throw new Error(`Filter object must have exactly one key: ${filterObj}`)
    const filterName = filterKeys[0]
    const filterOpts = filterObj[filterName]
    const Filter = filters[filterName]
    if (!Filter) throw new Error(`No filter found with name: ${filterName}`)
    const filter = Filter(Object.assign({}, filterOpts)) // TODO: mix-in config?
    return function({value}, index, opts) {
      value = filter(value, index, opts)
      if (typeof value == 'function') {
        return computed(value, value=>{
          if (!Array.isArray(value)) {
            return {value, label}
          }
          return value.map(value => {
            return {value, label}
          })
        })
      }
      if (!Array.isArray(value)) {
        return {value, label}
      }
      return value.map(value => {
        return {value, label}
      })
    }
  })


  const msgpath = Msgpath(ssb)
  const result = msgpath(Value({value: true, label: 'root'}), fstack, {defaultExtractor: x=>{throw new Error('No function in fstack')}, obsFromValue: x=>x})
  unsubscribe = result(chains =>{
    if (!chains) return
    chains = chains.map(chain=>{
      return chain.reduce( (acc, {value, label})=>{
        if (label) acc[label] = value
        return acc
      }, {})
    })
    console.log(`${chains.length} chain(s)`)
    chains.forEach(output)
    //console.dir(chains, {depth: 4})
  })

  function output({feed, role, station, station_content, image_key, image_content, blob, filename}) {
    if (!filename) return
    const ts = htime(new Date(role.value.timestamp))
    const author = role.value.author
    const target = feed == author ? 'self' : feed
    function shorter(x) {
      return x.slice(0,6)
    }
    console.log(`${ts} ${shorter(author)} asigned role "${station_content.name}" (${shorter(station)}) to ${target}`)
    console.log(`Saved image "${image_content.name}" (${shorter(image_key)}, ${image_content.width}x${image_content.height}px) to ${filename} (blobid: ${blob})`)
  }

  process.on('SIGINT', quit)
  process.on('SIGTERM', quit)

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

