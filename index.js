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
    debug_events = require('debug')('js-caching:Events');
    debug_internals = require('debug')('js-caching:Internals');

let input_template = {
  suspended: true,//start suspended
  id: "input.",
  conn: [
    // Object.merge(
    //   Object.clone(conn),
    //   {
    //     // path_key: 'os',
    //     module: InputPollerRethinkDBHosts,
    //   }
    // )
  ],
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
},

let output_template = {
  id: "output.",
  conn: [
    // {
    // 	//host: '127.0.0.1',
    // 	host: 'elk',
    // 	port: 5984,
    // 	db: 'dashboard',
    // 	opts: {
    // 		cache: true,
    // 		raw: false,
    // 		forceSave: true,
    // 	}
    // },
  ],
  // module: require(path.join(process.cwd(), 'lib/pipeline/output/cradle')),
  buffer:{
    size: 0,
    expire:0
  }
}

module.exports = new Class({
  Implements: [Pipeline],

  ON_GET: 'onGet',
  ON_SET: 'onSet',
  ON_DEL: 'onDel',
  ON_RESET: 'onReset',
  ON_PRUNE: 'onPrune',

  options: {
    stores: [Memory]
  },
  get: function(key, cb){
    if(typeof cb == 'function')
      cb()

    this.fireEvent(this.ON_GET)
  },
  set: function(key, value, ttl, cb){
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
  initialize: function(options){
    Array.each(options.stores, function(store, index){
      let input = Object.clone(input_template)
      options.input.push({ poll: input })

      let output = Object.clone(output_template)
      options.output.push({ store: output })

    })
    this.parent(options)
  },
})
