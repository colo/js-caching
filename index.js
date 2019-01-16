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

  ON_GET: 'onGet',
  ON_SET: 'onSet',
  ON_DEL: 'onDel',
  ON_RESET: 'onReset',
  ON_PRUNE: 'onPrune',

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
    if(typeof cb == 'function')
      cb()

    this.fireEvent(this.ON_GET)
  },
  set: function(key, value, ttl, cb){
    let _key = uuidv5(key, this.NS)

    debug_internals('set %s', _key)
    this.output({id: _key, data: value, metadata: {}})

    if(typeof cb == 'function')
      cb()

    this.fireEvent(this.ON_SET)
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
  initialize: function(options, cb){
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


    debug_internals('initialize %o', this.options.output)
    this.parent(options, cb)

  },
})
