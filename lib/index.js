'use strict';

var Resource = require('./Resource');
var Endpoint = require('./Endpoint');
var Controllers = require('./Controllers');

var epilogue = {
  initialize: function(args) {
    args = args || {};
    if (!args.app)
      throw new Error('please specify an app');
    if (!args.sequelize)
      throw new Error('please specify a sequelize instance');

    this.app = args.app;
    this.sequelize = args.sequelize;
    this.base = args.base || '';
    if (args.updateMethod) {
      var method = args.updateMethod.toLowerCase();
      if (!method.match(/^(put|post|patch)$/)) {
        throw new Error('updateMethod must be one of PUT, POST, or PATCH');
      }
      this.updateMethod = method;
    }
  },
  resource: function(args) {
    var endpoints = [];
    args = args || {};
    if (!args.model)
      throw new Error('please specify a valid model');

    args.endpoints.forEach(function(e) {
      var endpoint = this.base + e;
      endpoints.push(endpoint);
    }.bind(this));

    var resource = new Resource({
      app: this.app,
      sequelize: this.sequelize,
      model: args.model,
      endpoints: endpoints,
      actions: args.actions,
      include: args.include || [],
      updateMethod: this.updateMethod
    });

    return resource;
  },
  Resource: Resource,
  Endpoint: Endpoint,
  Controllers: Controllers
};

module.exports = epilogue;
