'use strict'

let App = require('node-app-rethinkdb-client')

var debug = require('debug')('js-caching:Stores:RethinkDB');
var debug_internals = require('debug')('js-caching:Stores:RethinkDB:Internals');
var debug_events = require('debug')('js-caching:Stores:RethinkDB:Events');


module.exports = new Class({
  Extends: App,

  options: {

		id: 'Stores:RethinkDB',

		requests : {
			periodical: [
			],
      once: [{
        get: function(req, next, app){
          if(req && req.type == 'get'){
            debug_internals('get', req, app.options.table)

            if(Array.isArray(req.id)){
              app.getAll({
                _extras: {type: req.type, id: req.id},
                uri: app.options.db+'/'+app.options.table,
                args: req.id
              })
            }
            else{
              app.get({
                _extras: {type: req.type, id: req.id},
                uri: app.options.db+'/'+app.options.table,
                args: [req.id]
              })
            }
          }
        }
      }]

		},

		routes: {

      // distinct: [{
      //   path: ':database/:table',
      //   callbacks: ['distinct']
      // }],

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
      if(params.options._extras.type == 'get'){
        if(Array.isArray(params.options._extras.id)){
          resp.toArray(function(err, arr){
            debug_internals('get_doc count', arr)
            this.fireEvent(
  						this[
  							'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
  						],
  						[arr, {id: this.id, type: params.options._extras.type, input_type: this, app: this}]
  					)
          }.bind(this))
        }
        else{
          debug_internals('get_doc count single', resp)
          this.fireEvent(
            this[
              'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC'
            ],
            [resp, {id: this.id, type: params.options._extras.type, input_type: this, app: this}]
          )


        }

      }



    }
  },

  // distinct: function(err, resp, params){
  //   debug_internals('distinct', params.options)
  //
  //   if(err){
  //     debug_internals('distinct err', err)
  //
	// 		if(params.uri != ''){
	// 			this.fireEvent('on'+params.uri.charAt(0).toUpperCase() + params.uri.slice(1)+'Error', err);//capitalize first letter
	// 		}
	// 		else{
	// 			this.fireEvent('onGetError', err);
	// 		}
  //
	// 		this.fireEvent(this.ON_DOC_ERROR, err);
  //
	// 		this.fireEvent(
	// 			this[
	// 				'ON_'+this.options.requests.current.type.toUpperCase()+'_DOC_ERROR'
	// 			],
	// 			err
	// 		);
  //   }
  //   else{
  //
  //     resp.toArray(function(err, arr){
  //       debug_internals('distinct count', arr)
  //
  //
  //       if(params.options._extras == 'path'){
  //         if(arr.length == 0){
  // 					debug_internals('No paths yet');
  // 				}
  // 				else{
  //
  //           this.paths = []
  //
  // 					Array.each(arr, function(row, index){
  // 						// debug_internals('Path %s', row);
  //
  //             if(
  //               (
  //                 !this.blacklist_path
  //                 || (this.blacklist_path && this.blacklist_path.test(row) == false)
  //               )
  //               && !this.paths.contains(row)
  //             )
  //               this.paths.push(row)
  //
  // 					}.bind(this));
  //
  // 					debug_internals('PATHs %o', this.paths);
  // 				}
  // 			}
  //       else if(params.options._extras == 'host'){
  //         if(arr.length == 0){
  // 					debug_internals('No hosts yet');
  // 				}
  // 				else{
  //
  //           Array.each(arr, function(row, index){
  //             // debug_internals('Host %s', row);
  //             //this.hosts.push({name: doc.key, last: null});
  //
  //             // if(this.hosts[doc.key] == undefined) this.hosts[doc.key] = -1;
  //             if(!this.hosts.contains(row))
  //               this.hosts.push(row)
  //
  //           }.bind(this));
  //
  //           debug_internals('HOSTs %o', this.hosts);
  // 				}
  //       }
  //
  //     }.bind(this))
  //
  //
  //   }
  // },

  initialize: function(options){
    debug_internals('initialize %o', options)

		this.parent(options);//override default options

		this.log('js-caching-rethinkdb', 'info', 'js-caching-rethinkdb started');

  },

});
