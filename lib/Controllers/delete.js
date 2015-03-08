'use strict';

var util = require('util'),
    Base = require('./base'),
    errors = require('../Errors');

var Delete = function(args) {
  Delete.super_.call(this, args);
};

util.inherits(Delete, Base);

Delete.prototype.action = 'delete';
Delete.prototype.method = 'delete';
Delete.prototype.plurality = 'singular';

Delete.prototype.fetch = function(req, res, context) {
  var model = this.model,
      endpoint = this.endpoint,
      criteria = context.criteria || {};

  endpoint.attributes.forEach(function(attribute) {
    criteria[attribute] = req.params[attribute];
  });

  return model
    .find({ where: criteria })
    .then(function(instance) {
      if (!instance) {
        throw new errors.NotFoundError();
      }

      context.instance = instance;
      return context.continue;
    });
};

Delete.prototype.write = function(req, res, context) {
  return context.instance
    .destroy()
    .then(function() {
      context.instance = {};
      return context.continue;
    });
};

module.exports = Delete;
