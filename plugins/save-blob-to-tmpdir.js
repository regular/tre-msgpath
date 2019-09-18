const {isBlob} = require('ssb-ref')
const {join} = require('path')
const os = require('os')
const fs = require('fs')
const pull = require('pull-stream')
const toPull = require('stream-to-pull-stream')
const Value = require('mutant/value')

module.exports = SaveBlobToTmpdir

function SaveBlobToTmpdir(ssb) {
  return function saveBlobToTmpdir({tmpdir}) {
    return function(blobid) {
      if (!isBlob(blobid)) return
      const filename = join(tmpdir || os.tmpdir(), blobid.slice(1,8))
      const obs = Value()
      pull(
        ssb.blobs.get(blobid),
        toPull.sink(fs.createWriteStream(filename), err=>{
          if (err) return obs.set(err)
          obs.set(filename)
        })
      )
      return obs
    }
  }
}

module.exports.register = function(tlc, ssb, config) {
  tlc.registerFilter('save-blob-to-tmpdir', SaveBlobToTmpdir(ssb))
}

