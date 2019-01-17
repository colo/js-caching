'use strict'

let Input = require('node-app-rethinkdb-client')
let Output = require('js-pipeline/output/rethinkdb')

var debug = require('debug')('js-caching:Stores:RethinkDB');
var debug_internals = require('debug')('js-caching:Stores:RethinkDB:Internals');
var debug_events = require('debug')('js-caching:Stores:RethinkDB:Events');


module.exports = {
  input: new Class({
    Extends: Input,

    options: {

  		id: 'Stores:RethinkDB',

  		requests : {
  			periodical: [
          {
            prune_docs: function(req, next, app){
              // if(req && req.type == 'prune'){
                debug_internals('prune_docs', req, app.options.table)


                app.table({
                  _extras: {type: 'prune'},
                  uri: app.options.db,
                  args: app.options.table
                })

              // }

            }
          },
  			],
        once: [
          {
            get_doc: function(req, next, app){
              if(req && req.type == 'get'){
                debug_internals('get', req, app.options.table)

                if(Array.isArray(req.id)){
                  app.getAll({
                    _extras: {type: req.type, id: req.id, key: req.key},
                    uri: app.options.db+'/'+app.options.table,
                    args: req.id
                  })
                }
                else{
                  app.get({
                    _extras: {type: req.type, id: req.id, key: req.key},
                    uri: app.options.db+'/'+app.options.table,
                    args: [req.id]
                  })
                }
              }

            }
          },
          {
            del_doc: function(req, next, app){
              if(req && req.type == 'del'){
                debug_internals('del', req, app.options.table)

                if(Array.isArray(req.id)){
                  app.getAll({
                    _extras: {type: req.type, id: req.id, key: req.key},
                    uri: app.options.db+'/'+app.options.table,
                    args: req.id
                  })
                }
                else{
                  app.get({
                    _extras: {type: req.type, id: req.id, key: req.key},
                    uri: app.options.db+'/'+app.options.table,
                    args: [req.id]
                  })
                }
              }

              // next()
            }
          },
          {
            prune_docs: function(req, next, app){
              if(req && req.type == 'prune'){
                debug_internals('prune_docs', req, app.options.table)


                app.table({
                  _extras: {type: req.type},
                  uri: app.options.db,
                  args: app.options.table
                })

              }

            }
          },
      ]

  		},

  		routes: {

        // distinct: [{
        //   path: ':database/:table',
        //   callbacks: ['distinct']
        // }],

        table: [{
          path: ':database',
          callbacks: ['prune']
        }],
        get: [{
          path: ':database/:table',
          callbacks: ['get_doc']
        }],
        getAll: [{
          path: ':database/:table',
          callbacks: ['get_doc']
        }],
  		},

    },
    prune: function(err, resp, params){
      debug_internals('prune', params.options)

      if(err){
        debug_internals('get_doc err', err)

  			if(params.uri != ''){
  				this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1)+'Error', err);//capitalize first letter
  			}
  			else{
  				this.fireEvent('onGetError', err);
  			}

  			this.fireEvent(this.ON_DOC_ERROR, err);

  			this.fireEvent(
  				this[
  					'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC_ERROR'
  				],
  				err
  			);
      }
      else{
        let type = params.options._extras.type

        resp.toArray(function(err, arr){
          debug_internals('prune count', arr)

          Array.each(arr, function(d){
            if(!d.metadata) d.metadata = {expire: 0}

            // d.metadata.expire = 0

          })


          this.fireEvent(
            this[
              'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
            ],
            [arr, {id: this.id, type: type, input_type: this, app: this}]
          )
        }.bind(this))

          // if(resp.length > 0){
          //
          //   resp.toArray(function(err, arr){
          //     debug_internals('prune count', arr)
          //
          //     Array.each(arr, function(d){
          //       if(!d.metadata) d.metadata = {}
          //
          //       d.metadata.expire = 0
          //
          //     })
          //
          //
          //     this.fireEvent(
    			// 			this[
    			// 				'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
    			// 			],
    			// 			[arr, {id: this.id, type: type, input_type: this, app: this}]
    			// 		)
          //   }.bind(this))
          // }
          // else{
          //   debug_internals('prune count single', resp)
          //
          //
          //   this.fireEvent(
          //     this[
          //       'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
          //     ],
          //     [resp, {id: this.id, type: type, input_type: this, app: this}]
          //   )
          //
          //
          // }





      }
    },
    get_doc: function(err, resp, params){
      debug_internals('get_doc', params.options)

      if(err){
        debug_internals('get_doc err', err)

  			if(params.uri != ''){
  				this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1)+'Error', err);//capitalize first letter
  			}
  			else{
  				this.fireEvent('onGetError', err);
  			}

  			this.fireEvent(this.ON_DOC_ERROR, err);

  			this.fireEvent(
  				this[
  					'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC_ERROR'
  				],
  				err
  			);
      }
      else{
        let type = params.options._extras.type
        if(type == 'get' || type == 'del'){
          if(Array.isArray(params.options._extras.id)){

            resp.toArray(function(err, arr){
              debug_internals('get_doc count', arr)

              if(type == 'del'){//force deletion by setting expire = 0
                Array.each(arr, function(d){
                  if(!d.metadata) d.metadata = {}

                  d.metadata.expire = 0

                })
              }

              this.fireEvent(
    						this[
    							'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
    						],
    						[arr, {id: this.id, type: type, input_type: this, app: this}]
    					)
            }.bind(this))
          }
          else{
            debug_internals('get_doc count single', resp)

            if(type == 'del' && resp){//force deletion by setting expire = 0
              if(!resp.metadata) resp.metadata = {}
              resp.metadata.expire = 0
            }

            if(resp == null){
              //we need to return the asked keys
              if(params.options.args.length > 1){
                resp = []
                Array.each(params.options.args, function(arg, index){
                  resp.push({id: arg, metadata: {key: params.options._extras.key[index]}})
                })
              }
              else{
                resp = {id: params.options.args[0], metadata: { key: params.options._extras.key }}
              }
            }
            this.fireEvent(
              this[
                'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
              ],
              [resp, {id: this.id, type: type, input_type: this, app: this}]
            )


          }

        }



      }
    },

    initialize: function(options){
      debug_internals('initialize %o', options)

  		this.parent(options);//override default options

  		this.log('js-caching-rethinkdb', 'info', 'js-caching-rethinkdb started');

    },

  }),
  output: new Class({
    Extends: Output,

    ON_DOC_DELETED: 'onDocDeleted',
    ON_DELETE_DOC: 'onDeleteDoc',

    options: {
      buffer:{
        size: 0,
        expire:0
      },
      delete: {durability: 'hard', returnChanges: 'always'},
    },

    initialize: function(options){
      this.parent(options)
      this.addEvent(this.ON_DELETE_DOC, function(doc){
  			debug_events('this.ON_DELETE_DOC %o', doc);

  			this.delete(doc);
  		}.bind(this));
    },
    delete: function(doc){

      Array.each(this.conns, function(conn, index){
        // let table = this.options.conn[index].table
        let db = this.options.conn[index].db
        let table = this.options.conn[index].table
        let accept = this.options.conn[index].accept

        debug_internals('delete %s %s %o', db, table, this.options.conn[index])
        if(accept === true){
          this._delete_docs(doc, index);
        }
        else{
          let _delete = function(){
            this._delete_docs(doc, index);
            this.removeEvent(this.ON_ACCEPT, _delete)
          }.bind(this)

          this.addEvent(this.ON_ACCEPT, _delete)
        }

      }.bind(this));
    },
    _delete_docs: function(doc, index){
  		debug_internals('_delete_docs %o %s %o', doc, index, this.options.insert);

      let db = this.options.conn[index].db
      let table = this.options.conn[index].table
      let conn = this.conns[index]

      if(Array.isArray(doc)){
        this.r.db(db).table(table).getAll(this.r.args(doc)).delete(this.options.delete).run(conn, function(err, result){
          debug_internals('delete result %o', err, result);
          this.fireEvent(this.ON_DOC_DELETED, [err, result])
        }.bind(this))
      }
      else if(doc){
        this.r.db(db).table(table).get(doc).delete(this.options.delete).run(conn, function(err, result){
          debug_internals('delete result %o', err, result);
          this.fireEvent(this.ON_DOC_DELETED, [err, result])
        }.bind(this))

      }
      else{
        this.r.db(db).table(table).delete().run(conn, function(err, result){
          debug_internals('delete result %o', err, result);
          this.fireEvent(this.ON_DOC_DELETED, [err, result])
        }.bind(this))
      }


  	},
  })
}
