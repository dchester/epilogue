'use strict';

var async = require('async'),
    _ = require('lodash'),
    Endpoint = require('../Endpoint');

var Controller = function(args) {
  this.initialize(args);
};

Controller.prototype.initialize = function(args) {
  this.endpoint = new Endpoint(args.endpoint);
  this.model = args.model;
  this.app = args.app;
  this.resource = args.resource;
  this.include = args.include;

  if (args.include.length) {
    var includeAttributes = [],
        includeModels = [];

    args.include.forEach(function(include) {
      if (!!include.model) {
        includeModels.push(include.model);
      } else {
        includeModels.push(include);
      }
    });

    _(this.model.associations).forEach(function(association) {
      if (_(includeModels).contains(association.target)) {
        includeAttributes.push(association.identifier);
      }
    });
    this.includeAttributes = includeAttributes;
  }

  this.route();
};

Controller.hooks = [
  'start',
  'auth',
  'fetch',
  'data',
  'write',
  'send',
  'complete'
];

Controller.hooks.forEach(function(hook) {
  ['_before', '', '_after'].forEach(function(modifier) {
    Controller.prototype[hook + modifier] = function(req, res, context) {
      context.continue();
    };
  });
});

Controller.prototype.error = function(req, res) {
  // passthrough
};

Controller.prototype.send = function(req, res, context) {
  if (context.error !== undefined) {
    res.json(context.error);
    return context.continue();
  }

  res.json(context.instance);
  return context.continue();
};

Controller.prototype.route = function() {
  var app = this.app,
      endpoint = this.endpoint,
      self = this;

  // NOTE: is there a better place to do this mapping?
  if (app.name === 'restify' && self.method === 'delete')
    self.method = 'del';

  app[self.method](endpoint.string, function(req, res) {
    self._control(req, res);
  });
};

Controller.prototype._control = function(req, res) {
  var work = [],
      _callback,
      skip = false,
      self = this,
      context = {
        instance: undefined,
        criteria: {},
        attributes: {},
        error: undefined,
        continue: function() { _callback(); },
        stop: function() { _callback(true); },
        skip: function() { skip = true; _callback(); }
      };

  Controller.hooks.forEach(function(hook) {
    [hook + '_before', hook, hook + '_after'].forEach(function(key, i) {
      var functions = self[key] instanceof Array ? self[key] : [self[key]];
      functions.forEach(function(f) {
        work.push(function(callback) {
          if (skip) return callback();
          _callback = callback;
          f.call(self, req, res, context);
        });
      });
    });

    work.push(function(callback) {
      skip = false;
      callback();
    });
  });

  async.series(
    work,
    function(err, results) {
      if (err) self.error(req, res);
    }
  );
};

Controller.prototype.milestone = function(name, callback) {
  if (!this[name])
    throw new Error("couldn't find milestone: " + name);

  if (!(this[name] instanceof Array))
    this[name] = [this[name]];

  this[name].push(callback);
};

module.exports = Controller;
