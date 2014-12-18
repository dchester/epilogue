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
    .success(function(instance) {
      if (!instance) {
        res.status(404);
        context.error = { error: 'not found' };
        return context.continue();
      }

      context.instance = instance;
      context.continue();
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
  _(context.attributes).extend(_(req.body).clone());

  this.endpoint.attributes.forEach(function(a) {
    if (req.params.hasOwnProperty(a))
      context.attributes[a] = req.params[a];
  });

  instance.setAttributes(context.attributes);

  var save = function(err) {
    instance
      .save()
      .success(function(instance) {
        context.instance = instance;
        context.continue();
      })
      .error(function(err) {
        res.status(500);
        context.error = { error: err };
        return context.continue();
      });
  };


  var validation = instance.validate();

  if (validation && typeof validation.success === 'function') {
    // sequelize 2.x
    validation
      .success(function(err) {
        if (err) {
          res.status(400);
          context.error = { error: err };
          context.continue();
        } else {
          save();
        }
      })
      .error(function(err) {
        res.status(500);
        context.error = { error: err };
        context.continue();
      });
  } else if (validation && typeof validation === 'object') {
    // sequelize 1.x error
    res.status(400);
    context.error = { error: validation };
    context.continue();
  } else {
    // sequelize 1.x success
    save();
  }
};

module.exports = Update;
