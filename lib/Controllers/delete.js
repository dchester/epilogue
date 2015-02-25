'use strict';

var util = require('util'),
    Base = require('./base');

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

  model
    .find({ where: criteria })
    .then(function(instance) {
      if (!instance) {
        res.status(404);
        context.error = { message: 'not found' };
        return context.continue();
      }

      context.instance = instance;
      return context.continue();
    })
    .catch(function(err) {
      res.status(500);
      context.error = {
        message: 'internal error',
        errors: [ err.message ]
      };

      return context.continue();
    });
};

Delete.prototype.write = function(req, res, context) {
  if (context.error !== undefined) {
    return context.skip();
  }

  context.instance
    .destroy()
    .then(function() {
      context.instance = {};
      return context.continue();
    })
    .catch(function(err) {
      res.status(500);
      context.error = {
        message: 'internal error',
        errors: [ err.message ]
      };

      return context.continue();
    });
};

module.exports = Delete;
