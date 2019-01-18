'use strict'
let debug = require('debug')('js-caching:Test'),
    debug_events = require('debug')('js-caching:Test:Events'),
    debug_internals = require('debug')('js-caching:Test:Internals')

let jscaching = require('../index')

let RethinkDBStoreIn = require('../libs/stores/rethinkdb').input
let RethinkDBStoreOut = require('../libs/stores/rethinkdb').output

let cache = new jscaching({
  suspended: false,
  stores: [
    {
      id: 'rethinkdb',
      conn: [
        {
          host: 'elk',
          port: 28015,
          db: 'test',
          table: 'cache',
          module: RethinkDBStoreIn,
        },
      ],
      module: RethinkDBStoreOut,
    }
  ],
})

cache.addEvent('onConnect', function(){
  debug_internals('onConnect')

  this.set('test', {somekey: 'value'}, undefined, function(err, result){
    if(err){
      debug('set test err %o', err)
    }
    else {
      debug('set test %o', result)

      this.get('test', function(err, result){
        if(err){
          debug('get test err %o', err)
        }
        else{
          debug('get test %o', result)

          // this.del('test', function(err, result){
          //   if(err)
          //     debug('del test err %o', err)
          //
          //   debug('del test %o', result)
          // })
        }
      }.bind(this))

    }
  }.bind(this))

  this.set('test2', 'value2', undefined, function(err, result){
    if(err)
      debug('set test2 err %o', err)

    debug('set test2 %o', result)
  })

  this.set(['test2', 'test3'], 'value2', undefined, function(err, result){
    if(err)
      debug('set test2/test3 (err) err %o', err)

    debug('set test2/test3 (err) %o', result)
  })

  this.set(['test2', 'test3'], ['value2', 'value3'], 1000, function(err, result){
    if(err){
      debug('set test2/test3 err %o', err)
    }
    else{
      debug('set test2/test3 %o', result)

      this.get(['test2', 'test3'], function(err, result){
        if(err){
          debug('get test2/test3 %o', err)
        }
        else{
          debug('get test2/test3 %o', result)


          // this.reset(function(err, result){
          //   if(err)
          //     debug('reset err %o', err)
          //
          //   debug('reset %o', result)
          // })
        }
      }.bind(this))
    }

  }.bind(this))

  this.get(undefined, function(err, result){
    if(err)
      debug('get undefined %o', err)

    debug('get undefined %o', result)
  })

  this.del(undefined, function(err, result){
    if(err)
      debug('del undefined err %o', err)

    debug('del undefined %o', result)
  })

  this.set('test4', {somekey: 'value4'}, undefined, function(err, result){
    if(err){
      debug('set test4 err %o', err)
    }
    else {
      debug('set test4 %o', result)

      // this.del('test4', function(err, result){
      //   // debug('del test4 err %o', err)
      //   // debug('del test4 %o', result)
      //   if(err){
      //     debug('del test4 err %o', err)
      //   }
      //   else{
      //     debug('del test4 %o', result)
      //
      //     this.get('test4', function(err, result){
      //       if(err)
      //         debug('get test4 err %o', err)
      //
      //       debug('get test4 %o', result)
      //     })
      //   }
      // }.bind(this))

    }
  }.bind(this))




  // this.prune(function(err, result){
  //   if(err)
  //     debug('prune err %o', err)
  //
  //   debug('prune %o', result)
  // })
}.bind(cache))
