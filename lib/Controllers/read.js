'use strict';

var util = require('util'),
    Base = require('./base');

var Read = function(args) {
  Read.super_.call(this, args);
};

util.inherits(Read, Base);

Read.prototype.action = 'read';
Read.prototype.method = 'get';
Read.prototype.plurality = 'singular';

Read.prototype.fetch = function(req, res, context) {
  var model = this.model,
      endpoint = this.endpoint,
      criteria = {},
      include = this.include,
      includeAttributes = this.includeAttributes,
      options = {};

  endpoint.attributes.forEach(function(attribute) {
    criteria[attribute] = req.params[attribute];
  });

  if (Object.keys(criteria).length) {
    options.where = criteria;
  }

  if (include.length) {
    options.include = include;
    options.attributes =
      Object.keys(model.rawAttributes).filter(function(attr) {
        return includeAttributes.indexOf(attr) === -1;
      });
  }

  model
    .find(options)
    .then(function(instance) {
      if (!instance) {
        res.json(404, { error: 'not found' });
        return context.stop();
      }

      context.instance = instance;
      return context.continue();
    })
    .catch(function(err) {
      res.json(500, { error: err });
      return context.stop();
    });
};

module.exports = Read;
