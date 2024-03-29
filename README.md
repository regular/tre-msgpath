tre-msgpath
---

Like [pathway](https://www.npmjs.com/package/pathway), but for [mutable ssb messages]((https://www.npmjs.com/package/ssb-revisions) and with changes in real-time!

``` js
const Msgpath = require('tre-msgpath')
const collect = require('collect-mutations')
const client = require('tre-cli-client')

client( (err, ssb)=>{
  const msgpath = Msgpath(ssb)
  const webapps = MutantArray()
  pull( ssb.revisions.messagesByType('webapp'), collect(webapps))
  
  // webapps contains observablaes for the latest version of each webapp
  // Each webapp has a icon property which is a message reference to a message of type image
  // Images have a property file, which in turn has properties type and name.

  const icons = msgpath(webapps, [ ['icon'], ['file', /type|name/']])
```

License: MIT

const Msgpath = require('.')
const test = require('tape')
const Value = require('mutant/value')

test('simple', t=>{
  t.plan(1)
  const ssb = {}

  const root = Value()
  const msg = {
    key: 'foo',
    value: {
      content: {
        a: 'bar'
      }
    }
  }

  const unsubscribe = msgpath(root, [['value', 'content', 'a']])(value => {
    t.deepEqual(value, [msg, 'bar'], 'chain of values')
  })

  root.set(msg)
})

test('message reference', t=>{
  t.plan(3)

  const ref = rndKey()
  const opts = {allowAllAuthors: true}

  const ssb = {
    revisions: {
      heads: (key, o) => {
        t.equal(key, ref, 'ref matches')
        t.equal(o.allowAllAuthors, opts.allowAllAuthors, 'allowAllAuthors is passed through')
        return pull.values([{heads: [msg2], meta}])
      }
    }
  }
  const msgpath = Msgpath(ssb)

  const root = Value()
  const msg = {
    key: 'foo1',
    value: {
      content: {
        a: ref
      }
    }
  }
  const msg2 = {
    key: 'foo2',
    value: {
      content: {
        b: 'baz'
      }
    }
  }
  const meta = {
    what: 'ever'
  }

  const unsubscribe = msgpath(root, [['value', 'content', 'a'], ['value', 'content', 'b']], opts
  )(value => {
    t.deepEqual(value, [msg, Object.assign({}, msg2, {meta}), 'baz'], 'chain of values')
  })

  root.set(msg)
})

test('function instead of path', t=>{
  t.plan(3)

  const msgpath = Msgpath()

  const values = [
    Value(),
    Value(),
    Value()
  ]

  function f1(x, i) {
    t.equal(i, 0)
    return values[x]
  }

  function f2(x, i) {
    t.equal(i, 1)
    return values[-x]
  }

  msgpath(values[0], [f1, f2])(value => {
    t.deepEqual(value, [1, -2, 'hello'], 'correct result')
  })

  values[2].set('hello')
  values[1].set(-2)
  values[0].set(1)
})

test.only('multiple routes', t=>{
  t.plan(3)
  const msgpath = Msgpath()

  const values = [
    Value(),
    Value(),
    Value()
  ]
  const obj = {
    x: 1.1, // rounds to 1 -> bar
    y: 1.6, // rounds to 2 -> foo
    a: 0    // ignored
  }

  function roundRef(x, i) {
    t.equal(i, 1)
    const idx = Math.round(x)
    return values[idx]
  }

  msgpath(values[0], [[/[xyz]/], roundRef])(value => {
    console.log(value)
    t.deepEqual(value, [obj, [obj.x, obj.y], ['bar', 'foo']])
  })

  values[2].set('foo')
  values[1].set('bar')
  values[0].set(obj)
})

function rndKey() {
  return '%' +  crypto.randomBytes(32).toString('base64') + '.sha256'
}
