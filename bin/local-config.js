#!/usr/bin/env node
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
const {Formatter} = require('node-fomatto')
const traverse = require('traverse')

function shorten(v,l) { return (v||'').slice(0,l) }
const format = Formatter({htime: x=>htime(new Date(x)), shorten})

const sourcefile = config._[0]
if (!sourcefile) {
  console.error(`Usage: ${process.argv[0]} SOURCE [--confg SSB-CONFIG]`)
  process.exit(1)
}

const {select, act} = JSON.parse(fs.readFileSync(sourcefile))

client( (err, ssb)=>{
  bail(err)

  let unsubscribe = x=>{}

  const filters = {}
  const actions = {}
  const tlc = {
    registerFilter: function(name, f) {
      filters[name] = f
    },
    registerAction: function(name, f) {
      actions[name] = f
    }
  }

  const pluginNames = 'who-am-i role debounce deref-msg move-file pathway save-blob-to-tmpdir log'.split(' ')
  pluginNames.forEach(name=>{
    require(`../plugins/${name}`).register(tlc, ssb, config)
  })

  const fstack = select.map(filterObj => {
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
    const scopes = chains.map(chain=>{
      const last = chain.slice(-1)[0].value
      if (nullish(last)) return null
      return chain.reduce( (acc, {value, label})=>{
        if (label) acc[label] = value
        return acc
      }, {})
    })
    scopes.forEach(scope=>{
      if (!nullish(scope)) runActions(scope, (err, result)=>{
        if (err) return console.error(err.message)
        console.log(`All actions succeeded. Result: ${result}`)
      })
    })
  })

  function runActions(scope, cb) {
    let index = 0
    function next(err, lastResult) {
      if (err) return cb(err)
      debug(`Result: ${lastResult}`)
      const actObj = act[index++]
      if (!actObj) return cb(null, lastResult)
      const actKeys = Object.keys(actObj)
      if (actKeys.length !== 1) return cb(new Error('actObj must have one key only'))
      const actName = actKeys[0]
      const rawOpts = actObj[actName]
      const actOpts = traverse(rawOpts).map(function(x) {
        if (this.isLeaf && typeof x == 'string') this.update(format(x, Object.assign({}, scope, {_: lastResult})))
      })
      const action = actions[actName]
      if (!action) throw new Error(`No action named ${actName}`)
      debug(`Running ${actName} ${JSON.stringify(actOpts)}`)
      action(scope, actOpts, rawOpts, next)
    }
    next(null, null)
  }

  process.on('SIGINT', quit)
  process.on('SIGTERM', quit)

  function quit() {
    console.error('\nclosing')
    unsubscribe()
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

function nullish(x) {
  return x == null || x == undefined
}
