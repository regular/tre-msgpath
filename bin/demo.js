const Msgpath = require('..')
const collect = require('collect-mutations')
const Value = require('mutant/value')
const computed = require('mutant/computed')
const MutantArray = require('mutant/array')
const client = require('tre-cli-client')
const pull = require('pull-stream')
const htime = require('human-time')

// for blobs
const {isBlob} = require('ssb-ref')
const {join} = require('path')
const os = require('os')
const fs = require('fs')
const toPull = require('stream-to-pull-stream')

/* Use cases
 * configure hostname
 * configure smtp
 * screen setup
 * configure show control
 * configure treos-update?
 * configure treos-journald
 */

/*
actions:
  - write template file
  - write blob, return filename
  - run command (template)

*/

/* config foemat
 *
 {
   "msgpath": [
      ['content', 'photo-overlay'],
      ['value', 'content', 'blob'],
    ],
    "actions": [
      {type: "run", command: "mv ${filename} /var/basf/photo-overlay",
    ]
  }

  {
   "msgpath": [
      ['hostname']
    ],
    "actions": [
      {type: "run", "command": "hostname ${value}",
    ]
  }

  {
   "msgpath": [
      ['smtp'],
      {"type": "template", "template": '/etc/basf/esmtp-template", "output": "/etc/emtp.conf"}
    ],
    "actions": [
      {type: "template", "command": "hostname ${value}",
    ]
  }
 
 */


client( (err, ssb)=>{
  bail(err)
  const id = Value()
  ssb.whoami( (err, feed)=>{
    bail(err)
    id.set(feed.id)
  })
  const msgpath = Msgpath(ssb)
  const roles = MutantArray()
  let drain
  pull(ssb.revisions.messagesByType('role', {live: true, sync: true}), drain = collect(roles, {sync: true}))
  
  const result = msgpath(roles, [
    kv => computed(id, id => kv.value.content.about == id ? kv : null),
    ['value', 'content', 'station']
    //['value', 'content', ['file', 'blob']]
  ], {allowAllAuthors: true})

  const stationConfig = computed(result, result => {
    if (!result || !result.length) return
    result = result.slice().sort( (a, b)=>{
      return b[1].value.timestamp - a[1].value.timestamp
    })
    const [all, mine, station] = result[0]
    const ts = mine.value.timestamp
    const key = station.key
    const content = station.value && station.value.content
    return {
      ts, key, content
    }
  })

  const station = debounce(stationConfig, 200)

  const unsubscribe = station( c =>{
    if (!c) return
    const {ts, key, content} = c
    console.log(`${htime(new Date(ts))} ${key} ${content && content.name}`)
  })

  const overlay = debounce(msgpath(station, [
    ['content', 'photo-overlay'],
    ['value', 'content', 'blob'],
    blob => {
      if (!isBlob(blob)) return
      const filename = join(os.tmpdir(), blob.slice(1,8))
      const obs = Value()
      pull(
        ssb.blobs.get(blob),
        toPull.sink(fs.createWriteStream(filename), err=>{
          if (err) return console.error(err.message)
          obs.set(filename)
        })
      )
      return obs
    }
  ], {allowAllAuthors: true}), 200)

  const unsubscribe2 = overlay( row =>{
    console.dir(row[0].slice(-1)[0], {depth: 2})
  })

  process.on('SIGINT', quit)
  process.on('SIGTERM', quit)

  function quit() {
    console.error('\nclosing')
    unsubscribe()
    unsubscribe2()
    drain.abort()
    ssb.close()
  }
})

// -- util
function bail(err) {
  if (err) {
    console.error(err.message)
    process.exit(1)
  }
}
function debounce(o, ms) {
  return function(handler) {
    if (handler == undefined) return o()
    let timer
    const unsubscribe = o(v=>{
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout( ()=>{
        timer = undefined
        handler(v)
      }, ms)
    })
    return function() {
      unsubscribe()
      if (timer !== undefined) clearTimeout(timer)
    }
  }
}
