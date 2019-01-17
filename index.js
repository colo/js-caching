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

// let RethinkDBStoreIn = require('./stores/rethinkdb')
// let RethinkDBStoreOut = require('js-pipeline/output/rethinkdb')
let RethinkDBStoreIn = require('./stores/rethinkdb').input
let RethinkDBStoreOut = require('./stores/rethinkdb').output


const uuidv5 = require('uuid/v5')
const uuidv4 = require('uuid/v4')

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
  conn: []
}

module.exports = new Class({
  Extends: Pipeline,

  NS: '2405a7f9-a8cc-4976-9e61-d9396ca67c1b',

  ON_CONNECT: 'onConnect',
  ON_INTERNAL_GET_OUTPUT: 'onInternalGetOutput',
  ON_INTERNAL_DEL_OUTPUT: 'onInternalDelOutput',
  ON_INTERNAL_PRUNE_OUTPUT: 'onInternalPruneOutput',

  ON_GET: 'onGet',
  ON_SET: 'onSet',
  ON_DEL: 'onDel',
  ON_RESET: 'onReset',
  ON_PRUNE: 'onPrune',

  __input_connected: false,
  __output_connected: false,

  options: {
    suspended: true,
    input: [],
		filters: [
      function(doc, opts, next, pipeline){
        let { type, input, input_type, app } = opts
        debug_internals('first filter %s %o', type, doc)

        if(type == 'get' || type == 'del' || type == 'prune'){
          let err = undefined
          let output = {key: undefined, data: undefined}
          let _concat_key = ''
          if(Array.isArray(doc) && doc.length > 0){

            Array.each(doc, function(d){
              if(d.metadata){
              _concat_key += d.metadata.key
                if(d.metadata.expire !== undefined && d.metadata.expire <= Date.now()){
                  /**
                  * @todo implement 404
                  **/
                  if(!err)
                    err = {
                      status: 419,// Page Expired (Laravel Framework)
                      message: 'Expired',
                      data: []
                    }

                  // err.data.push(d.data)
                  err.data.push({value: d.data, key: d.metadata.key })
                }
                else{
                  if(!output.data) output.data = []
                  output.status = 200,
                  output.message = 'Ok',
                  output.data.push(d.data)
                }
              }
            })
          }
          else if(Array.isArray(doc) && doc.length == 0){
            err = {
              status: 404,// Page Expired (Laravel Framework)
              message: 'Not Found',
            }
          }
          else if(doc && doc.metadata){
            _concat_key = doc.metadata.key


            if(doc.metadata.expire !== undefined && doc.metadata.expire <= Date.now()){
              err = {
                status: 419,// Page Expired (Laravel Framework)
                message: 'Expired',
                data: [{value: doc.data, key: doc.metadata.key }]

              }

              // err = {
              //   message: 'Gone',
              //   /**
              //   * The requested resource is no longer available at the server and no forwarding
              //   address is known. This condition is expected to be considered permanent.
              //   **/
              //   status: 410,
              //
              // }
            }
            else if(!doc.data){
              err = {
                status: 404,// Page Expired (Laravel Framework)
                message: 'Not Found',
                data: [{key: doc.metadata.key }]
              }
            }
            else{
              output.status = 200,
              output.message = 'Ok',
              output.data = doc.data
            }
          }

          if(_concat_key){
            _concat_key = uuidv5(_concat_key, pipeline.NS)
            output.key = _concat_key


          }
          pipeline.outputs[0]({type: type, err: err, doc: output})
        }

      }
    ],
		output: [
      function(payload){
        let {type, err, doc} = payload

        if(type == 'get' || type == 'del' || type == 'prune'){
          debug_internals('first output %o', payload)
          // if(Array.isArray(doc))
          //   doc = [doc]
          if(err && err.status == 419){
            let _delete_keys = err.data.map(function(item, index){ return uuidv5(item.key, this.NS) }.bind(this))
            Array.each(this.outputs, function(output, index){
              if(index != 0)
                output.fireEvent(output.ON_DELETE_DOC, [_delete_keys])
            }.bind(this))

            if(type == 'del' || type == 'prune'){//on del switch err & doc.data
              if(!err.data){//means there was no doc(s)
                err = {
                  status: 404,
                  message: 'Not Found',
                  key: err.metadata.key
                }
              }
              else{
                doc.data = Array.clone(err.data)
                err = null
              }
            }
          }

          switch (type) {
            case 'get':
              this.fireEvent(this.ON_INTERNAL_GET_OUTPUT, [err, doc.data])
              break;

            case 'del':
              this.fireEvent(this.ON_INTERNAL_DEL_OUTPUT, [err, doc.data])
              break;

            case 'prune':
              this.fireEvent(this.ON_INTERNAL_PRUNE_OUTPUT, [err, doc.data])
              break;
          }


        }

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

    ttl: 10000,
  },
  get: function(key, cb){

    if(!key){
      // _get('you need to provide a "key" ', null)
      this.fireEvent(this.ON_GET, ['you need to provide a "key" ', null])

      if(typeof cb == 'function')
        cb('you need to provide a "key" ', null)
    }
    else{
      let _get = {}
      let _concat_key = ''

      let input = {type: 'get', id: undefined, key: undefined}
      if(Array.isArray(key)){
        input.id = []
        input.key = []
        Array.each(key, function(_key){
          _concat_key += _key
          input.key.push(_key)
          input.id.push(uuidv5(_key, this.NS))
        }.bind(this))
      }
      else{
        input.key = key
        input.id = uuidv5(key, this.NS)
        _concat_key = key
      }
      _concat_key = uuidv5(_concat_key, this.NS)

      _get[_concat_key] = function(err, result){
        debug_internals('_get %o %o', err, result)
        this.removeEvent(this.ON_INTERNAL_GET_OUTPUT+'.'+_concat_key, _get[_concat_key])

        this.fireEvent(this.ON_GET, [err, result])

        if(typeof cb == 'function')
          cb(err, result)
      }.bind(this)

      this.addEvent(this.ON_INTERNAL_GET_OUTPUT+'.'+_concat_key, _get[_concat_key])
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

    if(!key){
      // _get('you need to provide a "key" ', null)
      this.fireEvent(this.ON_DEL, ['you need to provide a "key" ', null])

      if(typeof cb == 'function')
        cb('you need to provide a "key" ', null)
    }
    else{
      let _del = {}
      let _concat_key = ''

      let input = {type: 'del', id: undefined, key: undefined}
      if(Array.isArray(key)){
        input.id = []
        input.key = []
        Array.each(key, function(_key){
          _concat_key += _key
          input.key.push(_key)
          input.id.push(uuidv5(_key, this.NS))
        }.bind(this))
      }
      else{
        input.key = key
        input.id = uuidv5(key, this.NS)
        _concat_key = key
      }
      debug_internals('_del %s', _concat_key)

      _concat_key = uuidv5(_concat_key, this.NS)

      _del[_concat_key] = function(err, result){
        debug_internals('_del %o %o', err, result)

        this.removeEvent(this.ON_INTERNAL_DEL_OUTPUT+'.'+_concat_key, _del[_concat_key])

        this.fireEvent(this.ON_DEL, [err, result])

        if(typeof cb == 'function')
          cb(err, result)
      }.bind(this)



      this.addEvent(this.ON_INTERNAL_DEL_OUTPUT+'.'+_concat_key, _del[_concat_key])
      this.fireEvent(this.ON_ONCE, input)
    }


  },
  reset: function(cb){

    let _outputs_status = []

    let _reset = function(err, result, output){

      _outputs_status[output] = {err:err, result: result}
      debug_internals('_reset %o %o %d %d %d ', err, result, output, _outputs_status.length, this.outputs.length)

      if(_outputs_status.length == this.outputs.length -1){
        // debug_internals('_reset %o %o %d', err, result, output)

        let err = _outputs_status.map(function(item, index){return item.err})
        let result = _outputs_status.map(function(item, index){return item.result})
        err = err.clean()
        result = result.clean()
        if(err.length == 0) err = null
        if(result.length == 0) result = null

        this.fireEvent(this.ON_RESET, [err, result])

        if(typeof cb == 'function')
          cb(err, result)
      }
    }.bind(this)
    Array.each(this.outputs, function(output, index){
      if(index != 0){
        output.addEvent(output.ON_DOC_DELETED, function(err, result){
          _reset(err, result, index - 1)//index - 1 becasue we ommit 0
        }.bind(this))
        output.fireEvent(output.ON_DELETE_DOC)
      }
    }.bind(this))


  },
  prune: function(cb){

    let input = {type: 'prune', id: undefined, key: undefined}


    let _prune = function(err, result){
      debug_internals('_prune %o %o', err, result)
      this.removeEvent(this.ON_INTERNAL_PRUNE_OUTPUT, _prune)

      this.fireEvent(this.ON_PRUNE, [err, result])

      if(typeof cb == 'function')
        cb(err, result)
    }.bind(this)

    this.addEvent(this.ON_INTERNAL_PRUNE_OUTPUT, _prune)
    this.fireEvent(this.ON_ONCE, input)



  },
  _input_output_connected(type){
    debug_internals('_input_output_connected ... %s', type)
    this['__'+type+'_connected'] = true
    if(this.__input_connected && this.__output_connected)
      this.fireEvent(this.ON_CONNECT)
  },
  initialize: function(options){
    // this.setOptions(options)
    let suspended = (options && options.suspended !== undefined) ? options.suspended : this.options.suspended
    input_template.suspended = suspended
    debug_internals('initialize ', suspended)

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
