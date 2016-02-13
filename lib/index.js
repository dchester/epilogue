'use strict';

var Resource = require('./Resource'),
    Endpoint = require('./Endpoint'),
    Controllers = require('./Controllers'),
    Errors = require('./Errors'),
    inflection = require('inflection'),
    _ = require('lodash');

var requiredSequelizeAttrs = ['version', 'and', 'or', 'STRING', 'TEXT'];

var epilogue = {
  initialize: function(options) {
    options = options || {};
    if (!options.app)
      throw new Error('please specify an app');

    if (!options.sequelize)
      throw new Error('please specify a sequelize instance');

    this.app = options.app;
    this.sequelize = (options.sequelize.Sequelize) ?
      options.sequelize.Sequelize : options.sequelize;

    if (!_.every(requiredSequelizeAttrs, _.partial(_.has, this.sequelize)))
      throw new Error('invalid sequelize instance');

    this.base = options.base || '';
    if (options.updateMethod) {
      var method = options.updateMethod.toLowerCase();
      if (!method.match(/^(put|post|patch)$/)) {
        throw new Error('updateMethod must be one of PUT, POST, or PATCH');
      }

      this.updateMethod = method;
    }
  },

  resource: function(options) {
    options = options || {};
    _.defaults(options, {
      include: [],
      associations: false
    });

    if (!options.model)
      throw new Error('please specify a valid model');

    if (!options.endpoints || !options.endpoints.length) {
      options.endpoints = [];
      var plural = inflection.pluralize(options.model.name);
      options.endpoints.push('/' + plural);
      options.endpoints.push('/' + plural + '/:id');
    }

    var endpoints = [];
    options.endpoints.forEach(function(e) {
      var endpoint = this.base + e;
      endpoints.push(endpoint);
    }.bind(this));

    var resource = new Resource({
      app: this.app,
      sequelize: this.sequelize,
      model: options.model,
      endpoints: endpoints,
      actions: options.actions,
      include: options.include,
      pagination: options.pagination,
      updateMethod: this.updateMethod,
      search: options.search,
      sort: options.sort,
      reloadInstances: options.reloadInstances,
      associations: options.associations,
      excludeAttributes: options.excludeAttributes,
      readOnlyAttributes: options.readOnlyAttributes
    });

    return resource;
  },

  Resource: Resource,
  Endpoint: Endpoint,
  Controllers: Controllers,
  Errors: Errors
};

module.exports = epilogue;
