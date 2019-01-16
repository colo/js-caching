'use strict'
let debug = require('debug')('js-caching:Test'),
    debug_events = require('debug')('js-caching:Test:Events'),
    debug_internals = require('debug')('js-caching:Test:Internals')

let jscaching = require('../index')

let cache = new jscaching({}, function(){
  debug_internals('onInit')

  this.get('test', function(err, result){
    if(err)
      debug('get %o', err)

    debug('get %o', result)
  })

  this.set('test', 'value', function(err, result){
    if(err)
      debug('set err %o', err)

    debug('set %o', result)
  })

  this.del('test', function(err, result){
    if(err)
      debug('del err %o', err)

    debug('del %o', result)
  })

  this.reset(function(err, result){
    if(err)
      debug('reset err %o', err)

    debug('reset %o', result)
  })


  this.prune(function(err, result){
    if(err)
      debug('prune err %o', err)

    debug('prune %o', result)
  })
})
