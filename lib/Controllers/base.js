'use strict';

var _ = require('lodash'),
    Endpoint = require('../Endpoint'),
    Promise = require('bluebird'),
    errors = require('../Errors');

var Controller = function(args) {
  this.initialize(args);
};

Controller.prototype.initialize = function(options) {
  options = options || {};
  this.endpoint = new Endpoint(options.endpoint);
  this.model = options.model;
  this.app = options.app;
  this.resource = options.resource;
  this.include = options.include;

  if (options.include.length) {
    var includeAttributes = [], includeModels = [];
    options.include.forEach(function(include) {
      includeModels.push(!!include.model ? include.model : include);
    });

    _.forEach(this.model.associations, function(association) {
      if (_.includes(includeModels, association.target))
        includeAttributes.push(association.identifier);
    });
    this.includeAttributes = includeAttributes;
  }

  this.route();
};

Controller.milestones = [
  'start',
  'auth',
  'fetch',
  'data',
  'write',
  'send',
  'complete'
];

Controller.hooks = Controller.milestones.reduce(function(hooks, milestone) {
  ['_before', '', '_after'].forEach(function(modifier) {
    hooks.push(milestone + modifier);
  });

  return hooks;
}, []);

Controller.prototype.error = function(req, res, err) {
  res.status(err.status);
  res.json({
    message: err.message,
    errors: err.errors
  });
};

Controller.prototype.send = function(req, res, context) {
  res.json(context.instance);
  return context.continue;
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
  var hookChain = Promise.resolve(false),
      self = this,
      context = {
        instance: undefined,
        criteria: {},
        attributes: {},
        options: {}
      };

  if (['PATCH', 'POST', 'PUT'].indexOf(req.method) !== -1) {
    if (this.resource.readOnlyAttributes && this.resource.readOnlyAttributes.length) {
      // better to delete attributes from req.body, user can later set them in hooks
      this.resource.readOnlyAttributes.filter(function (attr) {
        delete req.body[attr];
      });
    }
  }

  Controller.milestones.forEach(function(milestone) {
    if (!self[milestone])
      return;

    [milestone + '_before', milestone, milestone + '_after'].forEach(function(hook) {
      if (!self[hook])
        return;

      hookChain = hookChain.then(function runHook(skip) {
        if (skip) return true;

        var functions = Array.isArray(self[hook]) ? self[hook] : [self[hook]];

        // return the function chain. This means if the function chain resolved
        // to skip then all the remaining hooks on this milestone will also be
        // skipped and we will go to the next milestone
        return functions.reduce(function(prev, current) {
          return prev.then(function runHookFunction(skipNext) {

            // if any asked to skip keep returning true to avoid calling further
            // functions inside this hook
            if (skipNext) return true;

            var decisionPromise = new Promise(function(resolve) {
              _.assign(context, {
                skip: function() {
                  resolve(context.skip);
                },
                stop: function() {
                  resolve(new errors.RequestCompleted());
                },
                continue: function() {
                  resolve(context.continue);
                },
                error: function(status, message, errorList, cause) {
                  // if the second parameter is undefined then we are being
                  // passed an error to rethrow, otherwise build an EpilogueError
                  if (_.isUndefined(message) || status instanceof errors.EpilogueError) {
                    resolve(status);
                  } else {
                    resolve(new errors.EpilogueError(status, message, errorList, cause));
                  }
                }
              });
            });

            return Promise.resolve(current.call(self, req, res, context))
              .then(function(result) {
                // if they were returned directly or as a result of a promise
                if (_.includes([context.skip, context.continue, context.stop], result)) {
                  // call it to resolve the decision
                  result();
                }

                return decisionPromise.then(function(decision) {
                  if (decision === context.continue) return false;
                  if (decision === context.skip) return true;

                  // must be an error/context.stop, throw the decision for error handling
                  if (process.domain) {
                    // restify wraps the server in domain and sets error handlers that get in the way of mocha
                    // https://github.com/dchester/epilogue/issues/83
                    return Promise.reject(decision);
                  }
                  throw decision;
                });
              });
          });
        }, Promise.resolve(false));
      });
    });

    hookChain = hookChain.then(function() {
      // clear any passed results so the next milestone will run even if a
      // _after said to skip
      return false;
    });
  });

  hookChain
    .catch(errors.RequestCompleted, _.noop)
    .catch(self.model.sequelize.ValidationError, function(err) {
      var errorList = _.reduce(err.errors, function(result, error) {
        result.push({ field: error.path, message: error.message });
        return result;
      }, []);

      self.error(req, res, new errors.BadRequestError(err.message, errorList, err));
    })
    .catch(errors.EpilogueError, function(err) {
      self.error(req, res, err);
    })
    .catch(function(err) {
      self.error(req, res, new errors.EpilogueError(500, 'internal error', [err.message], err));
    });
};

Controller.prototype.milestone = function(name, callback) {
  if (!_.includes(Controller.hooks, name))
    throw new Error('invalid milestone: ' + name);

  if (!this[name]) {
    this[name] = [];
  } else if (!Array.isArray(this[name])) {
    this[name] = [ this[name] ];
  }

  this[name].push(callback);
};

module.exports = Controller;
