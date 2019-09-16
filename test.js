const Msgpath = require('.')
const test = require('tape')
const Value = require('mutant/value')
const crypto = require('crypto')
const pull = require('pull-stream')

test('simple', t=>{
  t.plan(1)
  const ssb = {}
  const msgpath = Msgpath(ssb)

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
    t.deepEqual(value, [
      [msg, 'bar']
    ], 'chain of values')
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
    t.deepEqual(value, [
      [msg, Object.assign({}, msg2, {meta}), 'baz']
    ], 'chain of values')
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
    t.deepEqual(value, [
      [1, -2, 'hello']
    ], 'correct result')
  })

  values[2].set('hello')
  values[1].set(-2)
  values[0].set(1)
})

test('multiple routes', t=>{
  t.plan(1)
  const msgpath = Msgpath()

  const value = Value()

  const obj = {
    x: 1.1, // rounds to 1 -> bar
    y: 1.6, // rounds to 2 -> foo
    a: 0    // ignored
  }

  msgpath(value, [[/[xyz]/]])(value => {
    console.log(value)
    t.deepEqual(value, [
      [obj, obj.x],
      [obj, obj.y]
    ])
  })

  value.set(obj)
})

test('multiple routes with function returning single value', t=>{
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
    t.equal(i, 1, 'called with index 1')
    const idx = Math.round(x)
    return values[idx]
  }

  msgpath(values[0], [[/[xyz]/], roundRef])(value => {
    console.log(value)
    t.deepEqual(value, [
      [obj, obj.x, 'bar'],
      [obj, obj.y, 'foo']
    ])
  })

  values[2].set('foo')
  values[1].set('bar')
  values[0].set(obj)
})

function rndKey() {
  return '%' +  crypto.randomBytes(32).toString('base64') + '.sha256'
}
