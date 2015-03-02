'use strict';

var _ = require('lodash'),
    util = require('util'),
    Base = require('./base');

var Create = function(args) {
  Create.super_.call(this, args);
};

util.inherits(Create, Base);

Create.prototype.action = 'create';
Create.prototype.method = 'post';
Create.prototype.plurality = 'plural';

Create.prototype.write = function(req, res, context) {
  context.attributes = _.extend(context.attributes, req.body);

  var self = this;
  return self.model
    .create(context.attributes)
    .then(function(instance) {
      if (self.resource) {
        var endpoint = self.resource.endpoints.singular;
        var location = endpoint.replace(/:(\w+)/g, function(match, $1) {
          return instance[$1];
        });

        res.header('Location', location);
      }

      res.status(201);
      context.instance = instance;
      return context.continue;
    });
};

module.exports = Create;
