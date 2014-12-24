'use strict';

var _ = require('lodash'),
    util = require('util'),
    Base = require('./base');

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
  var model = this.model;
  var endpoint = this.endpoint;
  var criteria = context.criteria;

  endpoint.attributes.forEach(function(attribute) {
    criteria[attribute] = req.params[attribute];
  });

  model
    .find({ where: criteria })
    .then(function(instance) {
      if (!instance) {
        res.status(404);
        context.error = { error: 'not found' };
        return context.continue();
      }

      context.instance = instance;
      context.continue();
    })
    .catch(function(err) {
      res.status(500);
      context.error = {
        message: 'internal error',
        errors: [err]
      };

      return context.continue();
    });
};

Update.prototype.write = function(req, res, context) {
  if (!!context.error) context.skip();

  var instance = context.instance;
  _(context.attributes).extend(_(req.body).clone());

  this.endpoint.attributes.forEach(function(a) {
    if (req.params.hasOwnProperty(a))
      context.attributes[a] = req.params[a];
  });

  instance.setAttributes(context.attributes);
  instance
    .save()
    .then(function(instance) {
      context.instance = instance;
      context.continue();
    })
    .catch(instance.sequelize.ValidationError, function(err) {
      res.status(400);
      context.error = {
        message: err.message,
        errors: _.reduce(err.errors, function(result, error) {
          result.push({ field: error.path, message: error.message });
          return result;
        }, [])
      };

      return context.skip();
    })
    .catch(function(err) {
      res.status(500);
      context.error = {
        message: 'internal error',
        errors: [err]
      };

      return context.skip();
    });
};

module.exports = Update;
