const {isBlob} = require('ssb-ref')
const {join} = require('path')
const os = require('os')
const fs = require('fs')
const pull = require('pull-stream')
const toPull = require('stream-to-pull-stream')

module.exports = SaveBlobToTmpdir

function SaveBlobToTmpdir(ssb) {
  return function saveBlobToTmpdir(scope, {blobid, tmpdir}, rawOpts, cb) {
    if (!isBlob(blobid)) return cb(new Error(`Not a blob id: ${blobid}`))
    const filename = join(tmpdir || os.tmpdir(), blobid.slice(1,8))
    pull(
      ssb.blobs.get(blobid),
      toPull.sink(fs.createWriteStream(filename), err=>{
        if (err) return cb(err)
        cb(null, filename)
      })
    )
  }
}

module.exports.register = function(tlc, ssb, config) {
  tlc.registerAction('save-blob-to-tmpdir', SaveBlobToTmpdir(ssb))
}

