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
  var model = this.model;
  var endpoint = this.endpoint;
  var criteria = context.criteria;

  endpoint.attributes.forEach(function(attribute) {
    criteria[attribute] = req.params[attribute];
  });

  model
    .find({ where: criteria })
    .success(function(instance) {
      if (!instance) {
        // not sure this was ever reached even
        // return yield([404, { error: "not found" }]);

        res.status(404);
        context.error = { error: 'not found' };
        return context.continue();
      }

      context.instance = instance;
      return context.continue();
    })
    .error(function(err) {
      res.status(500);
      context.error = { error: err };
      return context.continue();
    });
};

Delete.prototype.write = function(req, res, context) {
  if (context.error !== undefined) {
    return context.skip();
  }

  var instance = context.instance;
  instance
    .destroy(instance)
    .success(function(instance) {
      context.instance = instance;
      return context.continue();
    })
    .error(function(err) {
      res.status(500);
      context.error = { error: err };
      return context.continue();
    });
};

module.exports = Delete;
