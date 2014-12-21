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
  _(context.attributes).extend(_(req.body).clone());

  this.endpoint.attributes.forEach(function(a) {
    if (req.params.hasOwnProperty(a))
      context.attributes[a] = req.params[a];
  });

  var self = this,
      model = self.model,
      instance = model.build(context.attributes);

  instance
    .save()
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
      context.continue();
    })
    .catch(self.model.sequelize.ValidationError, function(err) {
      res.status(400);
      context.error = _.reduce(err.errors, function(result, error) {
        result[error.path] = error.message;
        return result;
      }, {});

      return context.skip();
    })
    .catch(function(err) {
      res.status(500);
      context.error = { error: err };
      return context.skip();
    });
};

module.exports = Create;
