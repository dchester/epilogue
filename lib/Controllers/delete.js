"use strict";

var util = require('util'),
    Base = require('./base');

var Update = function(args) {
  Update.super_.call(this, args);
};

util.inherits(Update, Base);

Update.prototype.action = 'delete';
Update.prototype.method = 'delete';
Update.prototype.plurality = 'singular';

Update.prototype.fetch = function(req, res, context) {
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
        context.error = { error: "not found" };
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

Update.prototype.write = function(req, res, context) {
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

module.exports = Update;
