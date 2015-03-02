'use strict';

var _ = require('lodash'),
    util = require('util'),
    Base = require('./base'),
    errors = require('../Errors');

var Update = function(args) {
  if (args.resource.updateMethod)
    this.method = args.resource.updateMethod;
  Update.super_.call(this, args);
};

util.inherits(Update, Base);

Update.prototype.action = 'update';
Update.prototype.method = 'put';
Update.prototype.plurality = 'singular';

Update.prototype.fetch = function(req, res, context) {
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

Update.prototype.write = function(req, res, context) {
  var instance = context.instance;
  context.attributes = _.extend(context.attributes, req.body);

  this.endpoint.attributes.forEach(function(a) {
    if (req.params.hasOwnProperty(a))
      context.attributes[a] = req.params[a];
  });

  instance.setAttributes(context.attributes);
  return instance
    .save()
    .then(function(instance) {
      context.instance = instance;
      return context.continue;
    });
};

module.exports = Update;
