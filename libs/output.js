'use strict'

let debug = require('debug')('js-caching:output'),
    debug_events = require('debug')('js-caching:output:Events'),
    debug_internals = require('debug')('js-caching:output:Internals')

const uuidv5 = require('uuid/v5')

module.exports = [
  function(payload){
    let {type, err, doc} = payload

    if(type == 'get' || type == 'del' || type == 'prune'){
      debug_internals('first output %o', payload)
      // if(Array.isArray(doc))
      //   doc = [doc]
      if(err && err.status == 419){
        let _delete_keys = err.data.map(function(item, index){ return uuidv5(item.key, this.options.NS) }.bind(this))
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
          this.fireEvent(this.ON_INTERNAL_GET_OUTPUT+'.'+doc.key, [err, doc.data])
          break;

        case 'del':
          this.fireEvent(this.ON_INTERNAL_DEL_OUTPUT+'.'+doc.key, [err, doc.data])
          break;

        case 'prune':
          this.fireEvent(this.ON_INTERNAL_PRUNE_OUTPUT, [err, doc.data])
          break;
      }


    }

  }
]
