'use strict'


let Pipeline = require('js-pipeline')
let debug = require('debug')('js-caching'),
    debug_events = require('debug')('js-caching:Events'),
    debug_internals = require('debug')('js-caching:Internals')

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
}

let output_template = {
  id: "output.",
  conn: []
}

module.exports = new Class({
  Extends: Pipeline,

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
    NS: '2405a7f9-a8cc-4976-9e61-d9396ca67c1b',

    input: [],
		filters: require('./libs/filters'),
		output: require('./libs/output'),
    stores: [
      {
        id: undefined,
        conn: [
					{
            host: '127.0.0.1',
						port: undefined,
						db: undefined,
            table: undefined,
            module: undefined,
					},
				],
        module: undefined,
      }
    ],

    ttl: 1000,
  },
  clean: function(value){
    if(!value || value == null || typeof value == 'function')
      return undefined

    else if(Array.isArray(value)){
      Array.each(value, function(val, index){
        value[index] = this.clean(val)
      }.bind(this))
      value = value.clean()
    }
    else if(typeof value === 'object' && Object.getLength(value) > 0){
      Object.each(value, function(val, name){

        val = this.clean(val)

        if(!val)
          delete value[name]
      }.bind(this))
    }

    return value
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
          input.id.push(uuidv5(_key, this.options.NS))
        }.bind(this))
      }
      else{
        input.key = key
        input.id = uuidv5(key, this.options.NS)
        _concat_key = key
      }
      debug_internals('get: _concat_key %s', _concat_key)

      _concat_key = uuidv5(_concat_key, this.options.NS)



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
          output.push({id: uuidv5(_key, this.options.NS), data: value[index], metadata: {key: _key, timestamp: now, ttl: ttl, expire: now + ttl}})
        }.bind(this))
      }

    }
    else{
      let now = Date.now()
      output = {id: uuidv5(key, this.options.NS), data: value, metadata: {key: key, timestamp: now, ttl: ttl, expire: now + ttl}}
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
          input.id.push(uuidv5(_key, this.options.NS))
        }.bind(this))
      }
      else{
        input.key = key
        input.id = uuidv5(key, this.options.NS)
        _concat_key = key
      }
      debug_internals('_del %s', _concat_key)

      _concat_key = uuidv5(_concat_key, this.options.NS)

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
    this.setOptions(options)
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
