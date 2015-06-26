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

  var self = this;
  // check associated data
  if (this.include && this.include.length) {
    this.include.forEach(function(i) {
      var association = self.resource.associationsInfo[i.model.name];
      if (context.attributes.hasOwnProperty(association.as)) {
        var attr = context.attributes[association.as];

        if (_.isObject(attr) && attr.hasOwnProperty(association.primaryKey)) {
          context.attributes[association.identifier] = attr[association.primaryKey];
        } else if(context.attributes.hasOwnProperty(association.as) && attr === null) {
          context.attributes[association.identifier] = null;
        }
      }
    });
  }

  instance.setAttributes(context.attributes);

  // check if reload is needed
  var reloadAfter = self.resource.reloadInstances &&
    !!_.find(_.map(self.resource.associationsInfo, function(a) {
      return a.identifier;
    }), function(k) {
      return instance._changed.hasOwnProperty(k);
    });

  return instance
    .save()
    .then(function(instance) {
      if (reloadAfter) {
        return instance.reload({ include: self.include });
      } else {
        return instance;
      }
    })
    .then(function(instance) {
      if (self.include.length && self.resource.associationOptions.removeForeignKeys) {
        // remove foreign keys
        _.values(self.resource.associationsInfo).forEach(function(info) {
          delete instance.dataValues[info.identifier];
        });
      }

      context.instance = instance;
      return context.continue;
    });
};

module.exports = Update;
