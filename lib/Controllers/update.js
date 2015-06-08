'use strict';

var _ = require('lodash'),
    util = require('util'),
    Base = require('./base'),
    ReadController = require('./read');

var Update = function(args) {
  if (args.resource.updateMethod)
    this.method = args.resource.updateMethod;
  Update.super_.call(this, args);
};

util.inherits(Update, Base);

Update.prototype.action = 'update';
Update.prototype.method = 'put';
Update.prototype.plurality = 'singular';

Update.prototype.fetch = ReadController.prototype.fetch;

Update.prototype.write = function(req, res, context) {
  var instance = context.instance;
  context.attributes = _.extend(context.attributes, req.body);

  this.endpoint.attributes.forEach(function(a) {
    if (req.params.hasOwnProperty(a))
      context.attributes[a] = req.params[a];
  });

  // Update associated data
  var self = this,
      associationPrimKeys = [];
  if (this.include && this.include.length) {
    this.include.forEach(function(i) {
      var primKey = i.model.primaryKeyField,
          association = _.findWhere(self.model.associations, { target: i.model });

      if (association) {
        associationPrimKeys.push(association.identifier);
        if (context.attributes.hasOwnProperty(association.as)) {
          var attr = context.attributes[association.as];

          if (_.isObject(attr) && attr[primKey]) {
            context.attributes[association.identifier] = attr[primKey];
          }
        }
      }
    });
  }

  instance.setAttributes(context.attributes);

  // Check if reload is needed
  var reloadAfter = !!_.find(associationPrimKeys, function(k) {
    return instance._changed.hasOwnProperty(k);
  });

  return instance
    .save()
    .then(function(instance) {
      if (reloadAfter) {
        return instance.reload();
      } else {
        return instance;
      }
    })
    .then(function(instance) {
      context.instance = instance;
      return context.continue;
    });
};

module.exports = Update;
