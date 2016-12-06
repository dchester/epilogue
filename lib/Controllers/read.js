'use strict';

var util = require('util'),
    Base = require('./base'),
    errors = require('../Errors');

var Read = function(args) {
  Read.super_.call(this, args);
};

util.inherits(Read, Base);

Read.prototype.action = 'read';
Read.prototype.method = 'get';
Read.prototype.plurality = 'singular';

Read.prototype.fetch = function(req, res, context) {
  var model = this.model,
      endpoint = this.endpoint,
      options = context.options || {},
      criteria = context.criteria || {},
      include = this.include,
      includeAttributes = this.includeAttributes || [];

  // only look up attributes we care about
  options.attributes = options.attributes || this.resource.attributes;

  // remove params that are already accounted for in criteria
  Object.keys(criteria).forEach(function(attr) { delete req.params[attr]; });
  endpoint.attributes.forEach(function(attribute) {
    if (attribute in req.params) criteria[attribute] = req.params[attribute];
  });

  if (Object.keys(criteria).length) {
    options.where = criteria;
  }

  if (context.include && context.include.length) {
    include = include.concat(context.include);
  }

  if (include.length) options.include = include;
  if (this.resource.associationOptions.removeForeignKeys) {
    options.attributes = options.attributes.filter(function(attr) {
      return includeAttributes.indexOf(attr) === -1;
    });
  }

  if (req.query.scope) {
    model = model.scope(req.query.scope);
  }

  return model
    .find(options)
    .then(function(instance) {
      if (!instance) {
        throw new errors.NotFoundError();
      }

      context.instance = instance;
      return context.continue;
    });
};

module.exports = Read;
