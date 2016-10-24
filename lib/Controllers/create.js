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
  context.attributes = _.defaults(context.attributes, req.body);
  var self = this;

  // Check associated data
  if (this.include && this.include.length) {
    _.values(self.resource.associationsInfo).forEach(function(association) {
      if (context.attributes.hasOwnProperty(association.as)) {
        var attr = context.attributes[association.as];

        if (_.isObject(attr) && attr.hasOwnProperty(association.primaryKey)) {
          context.attributes[association.identifier] = attr[association.primaryKey];
          delete context.attributes[association.as];
        }
      }
    });
  }

  return this.model
    .create(context.attributes, {
      include: this.include
    })
    .then(function(instance) {
      if (self.resource) {
        var endpoint = self.resource.endpoints.singular;
        var location = endpoint.replace(/:(\w+)/g, function(match, $1) {
          return instance[$1];
        });

        res.header('Location', location);
      }

      if (self.resource.reloadInstances === true) {
        var reloadOptions = {};
        if (Array.isArray(self.include) && self.include.length)
          reloadOptions.include = self.include;
        if (!!self.resource.excludeAttributes)
          reloadOptions.attributes = { exclude: self.resource.excludeAttributes };
        return instance.reload(reloadOptions);
      }

      return instance;
    }).then(function(instance) {
      if (!!self.resource.excludeAttributes) {
        self.resource.excludeAttributes.forEach(function(attr) {
          delete instance.dataValues[attr];
        });
      }

      res.status(201);
      context.instance = instance;
      return context.continue;
    });
};

module.exports = Create;
