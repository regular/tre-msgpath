const {exec} = require('child_process')
const esc = require('any-shell-escape')

module.exports.register = function(tlc, ssb, config) {
  tlc.registerAction('shell', shell)

  function shell(scope, {command, args, env, cwd, encoding, timeout, maxBuffer, killSignal, uid, gid}, rawOpts, cb) {
    if (!command) return cb(new Error('`command` is a required argument for log'))
    const cmdline = esc([command].concat(args||[])).join(' ')
    console.log(cmdline)
    exec(cmdline, {command, args, env, cwd, encoding, timeout, maxBuffer, killSignal, uid, gid}, cb)
  }
}

