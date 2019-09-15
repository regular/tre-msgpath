const Msgpath = require('..')
const collect = require('collect-mutations')
const MutantArray = require('mutant/array')
const client = require('tre-cli-client')
const pull = require('pull-stream')

client( (err, ssb)=>{
  bail(err)
  const msgpath = Msgpath(ssb)
  const webapps = MutantArray()
  let drain
  pull(ssb.revisions.messagesByType('webapp', {live: true, sync: true}), drain = collect(webapps, {sync: true}))
  
  // webapps contains observablaes for the latest version of each webapp
  // Each webapp has an icon property which is a reference to a message of type image
  // Images have a property `file`, which in turn has properties `type` and `name`.

  const icons = msgpath(webapps, [
    [true, 'value', 'content', 'icon'],
    [true, 'value', 'content', ['file', 'blob']]
  ])

  const unsubscribe = icons(icons=>{
    console.dir(icons, {depth: 5})
  })
  process.on('SIGINT', quit)
  process.on('SIGTERM', quit)

  function quit() {
    console.error('\nclosing')
    unsubscribe()
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
