"use strict";

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
  var model = this.model;
  _(context.attributes).extend(_(req.body).clone());

  this.endpoint.attributes.forEach(function(a) {
    if (req.params.hasOwnProperty(a))
      context.attributes[a] = req.params[a];
  });

  var instance = model.build(context.attributes);
  var resource = this.resource;

  var save = function() {
    instance
      .save()
      .success(function(instance) {
        if (resource) {
          var endpoint = resource.endpoints.singular;
          var location = endpoint.replace(/:(\w+)/g, function(match, $1) { return instance[$1]; });
          res.header('Location', location);
        }

        res.status(201);
        context.instance = instance;
        context.continue();
      })
      .error(function(err) {
        res.json(500, { error: err });
        context.stop();
      });
  };

  var validation = instance.validate();

  if (validation && typeof validation.success === 'function') {
    // sequelize 2.x
    validation
      .success(function(err) {
        if (err) {
          res.json(400, { error: err });
          context.stop();
        } else {
          save();
        }
      })
      .error(function(err) {
        res.json(500, { error: err });
        context.stop();
      });
  } else if (validation && typeof validation === 'object') {
    // sequelize 1.x error
    res.json(400, { error: validation });
    context.stop();
  } else {
    // sequelize 1.x success
    save();
  }
};

module.exports = Create;
