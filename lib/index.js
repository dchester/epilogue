'use strict';

var Resource = require('./Resource'),
    Endpoint = require('./Endpoint'),
    Controllers = require('./Controllers'),
    Errors = require('./Errors'),
    inflection = require('inflection'),
    _ = require('lodash');

// make deep defaults the default
_.defaults = require('merge-defaults');

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
    args = args || {};
    if (!args.model)
      throw new Error('please specify a valid model');

    if (!args.endpoints || !args.endpoints.length) {
      args.endpoints = [];
      var plural = inflection.pluralize(args.model.name);
      args.endpoints.push('/' + plural);
      args.endpoints.push('/' + plural + '/:id');
    }

    var endpoints = [];
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
      pagination: args.pagination,
      updateMethod: this.updateMethod,
      search: args.search,
      sort: args.sort
    });

    return resource;
  },

  Resource: Resource,
  Endpoint: Endpoint,
  Controllers: Controllers,
  Errors: Errors
};

module.exports = epilogue;
