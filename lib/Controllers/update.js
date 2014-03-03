"use strict";

var _ = require('lodash'),
    util = require('util'),
    Base = require('./base');

var Update = function(args) {
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
      context.instance = instance;
      context.continue();
    })
    .error(function(err) {
      res.json(500, { error: err });
      context.stop();
    });
};

Update.prototype.write = function(req, res, context) {
  var instance = context.instance;
  _(context.attributes).extend(_(req.body).clone());

  this.endpoint.attributes.forEach(function(a) {
    if (req.params.hasOwnProperty(a))
      context.attributes[a] = req.params[a];
  });

  instance.setAttributes(context.attributes);

  var validationComplete = function (err) {
    if (err) {
      res.json(400, { error: err });
      context.stop();
    } else {
      instance
        .save()
        .success(function(instance) {
          context.instance = instance;
          context.continue();
        })
        .error(function(err) {
          res.json(500, { error: err });
          context.stop();
        });
    }
  };

  var err = instance.validate();
  if (err && typeof err.success === 'function') {
    err.success(validationComplete).error(function (err) {
      res.json(500, { error: err });
      context.stop();
    });
  } else {
    validationComplete();
  }
};

module.exports = Update;
