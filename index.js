'use strict'

// var	path = require('path')

// const App =  process.env.NODE_ENV === 'production'
//       ? require(path.join(process.cwd(), '/config/prod.conf'))
//       : require(path.join(process.cwd(), '/config/dev.conf'))
//
// const ETC =  process.env.NODE_ENV === 'production'
//       ? path.join(process.cwd(), '/etc/')
//       : path.join(process.cwd(), '/devel/etc/')

let Pipeline = require('js-pipeline')
let debug = require('debug')('js-caching'),
    debug_events = require('debug')('js-caching:Events'),
    debug_internals = require('debug')('js-caching:Internals')

let RethinkDBStoreIn = require('./stores/rethinkdb')
let RethinkDBStoreOut = require('js-pipeline/output/rethinkdb')

const uuidv5 = require('uuid/v5')

let input_template = {
  suspended: true,//start suspended
  id: "input.",
  conn: [],
  connect_retry_count: -1,
  connect_retry_periodical: 1000,
  requests: {
    periodical: 1000,
  },
  // requests: {
  // 	periodical: function(dispatch){
  // 		// //////////console.log('host periodical running')
  // 		return cron.schedule('* * * * * *', dispatch);//every second
  // 	}
  // },
}

let output_template = {
  id: "output.",
  conn: [],
  buffer:{
    size: 0,
    expire:0
  }
}

module.exports = new Class({
  Extends: Pipeline,

  NS: '2405a7f9-a8cc-4976-9e61-d9396ca67c1b',

  ON_CONNECT: 'onConnect',
  ON_GET: 'onGet',
  ON_SET: 'onSet',
  ON_DEL: 'onDel',
  ON_RESET: 'onReset',
  ON_PRUNE: 'onPrune',

  __input_connected: false,
  __output_connected: false,

  options: {
    input: [],
		filters: [],
		output: [
      function(doc){
        debug_internals('first output %o', doc)
      }
    ],
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

    ttl: 1000,
  },
  get: function(key, cb){

    let _get = function(err, result){
      debug_internals('_get %o %o', err, result)
      this.removeEvent(this.ON_ONCE, _get)

      this.fireEvent(this.ON_GET, [err, result])

      if(typeof cb == 'function')
        cb(err, result)
    }.bind(this)

    if(!key){
      _get('you need to provide a "key" ', null)
    }
    else{
      let input = {type: 'get', id: undefined}
      if(Array.isArray(key)){
        input.id = []
        Array.each(key, function(_key){
          input.id.push(uuidv5(_key, this.NS))
        }.bind(this))
      }
      else{
        input.id = uuidv5(key, this.NS)
      }
      this.fireEvent(this.ON_ONCE, input)
    }


  },
  set: function(key, value, ttl, cb){

    let output = undefined
    ttl = ttl || this.options.ttl

    let _saved = function(err, result){
      debug_internals('saved %o %o', err, result)
      this.removeEvent(this.ON_DOC_SAVED, _saved)

      this.fireEvent(this.ON_SET, [err, result])

      if(typeof cb == 'function')
        cb(err, result)
    }.bind(this)

    if(Array.isArray(key)){
      if(!Array.isArray(value) || value.length != key.length){
        cb('"key" doens\'t match "value" length', null)
      }
      else{
        output = []
        let now = Date.now()
        Array.each(key, function(_key, index){
          output.push({id: uuidv5(_key, this.NS), data: value[index], metadata: {key: _key, timestamp: now, ttl: ttl, expire: now + ttl}})
        }.bind(this))
      }

    }
    else{
      let now = Date.now()
      output = {id: uuidv5(key, this.NS), data: value, metadata: {key: key, timestamp: now, ttl: ttl, expire: now + ttl}}
    }

    debug_internals('set %o', output)

    if(output){
      this.addEvent(this.ON_DOC_SAVED, _saved)
      this.output(output)
    }

  },
  del: function(key, cb){
    if(typeof cb == 'function')
      cb()

    this.fireEvent(this.ON_DEL)
  },
  reset: function(cb){
    if(typeof cb == 'function')
      cb()

    this.fireEvent(this.ON_RESET)
  },
  prune: function(cb){

    if(typeof cb == 'function')
      cb()

    this.fireEvent(this.ON_PRUNE)
  },
  _input_output_connected(type){
    debug_internals('_input_output_connected ... %s', type)
    this['__'+type+'_connected'] = true
    if(this.__input_connected && this.__output_connected)
      this.fireEvent(this.ON_CONNECT)
  },
  initialize: function(options){
    // this.setOptions(options)

    Array.each(this.options.stores, function(store, index){
      let input = Object.merge(Object.clone(input_template), Object.clone(store))
      input.id = input_template.id + store.id
      // input.conn[0].module = RethinkDBStoreIn
      this.options.input.push({ poll: input })

      let output = Object.merge(Object.clone(output_template), Object.clone(store))
      output.id = output_template.id + store.id
      // output.module = RethinkDBStoreOut
      this.options.output.push({ store: output })

    }.bind(this))

    // this.addEvent(this.ON_CONNECT, function(){
    //   debug_internals('input connected %o %o', arguments)
    // })

    debug_internals('initialize %o', this.options.output)
    this.parent(options)


    Array.each(this.inputs, function(input){

      // input.addEvent('onClientConnect', poll => debug_internals('input connected %o', poll))
      input.addEvent('onClientConnect', poll => this._input_output_connected('input'));
      // debug_internals('input connected %o ', input)
    }.bind(this))

    Array.each(this.outputs, function(output){
      if(typeof output != 'function'){
        // debug_internals('output ... %o', output)
        output.addEvent(output.ON_CONNECT, result => this._input_output_connected('output'));
      }
    }.bind(this))
  },
})
