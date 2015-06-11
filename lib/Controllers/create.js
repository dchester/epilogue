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

  var self = this,
    associationPrimKeys = [];

  // Check associated data
  if (this.include && this.include.length) {
    this.include.forEach(function(i) {
      var primKey = i.model.primaryKeyField,
        association = _.findWhere(self.model.associations, { target: i.model });

      if (association) {
        associationPrimKeys.push(association.identifier);
        if (context.attributes.hasOwnProperty(association.as)) {
          var attr = context.attributes[association.as];

          if (_.isObject(attr) && attr.hasOwnProperty(primKey)) {
            context.attributes[association.identifier] = attr[primKey];
            delete context.attributes[association.as];
          }
        }
      }
    });
  }

  var options = {};
  if (self.include && self.include.length) {
    options.include = self.include;
  }

  // Check if reload is needed
  var reloadAfter = !!_.find(associationPrimKeys, function(k) {
    return context.attributes.hasOwnProperty(k);
  });

  return self.model
    .create(context.attributes, options)
    .then(function(instance) {
      if (self.resource) {
        var endpoint = self.resource.endpoints.singular;
        var location = endpoint.replace(/:(\w+)/g, function(match, $1) {
          return instance[$1];
        });

        res.header('Location', location);
      }

      // Reload for that all field are present
      return reloadAfter ? instance.reload() : instance;
    }).then(function(instance) {
      res.status(201);
      context.instance = instance;
      return context.continue;
    });
};

module.exports = Create;
