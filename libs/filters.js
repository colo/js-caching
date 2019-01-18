'use strict'

let debug = require('debug')('js-caching:filters'),
    debug_events = require('debug')('js-caching:filters:Events'),
    debug_internals = require('debug')('js-caching:filters:Internals')

const uuidv5 = require('uuid/v5')

module.exports = [
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
        debug_internals('filter: _concat_key %s', _concat_key)
        _concat_key = uuidv5(_concat_key, pipeline.options.NS)
        output.key = _concat_key


      }
      pipeline.outputs[0]({type: type, err: err, doc: output})
    }

  }
]
