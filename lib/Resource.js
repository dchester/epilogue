'use strict';

var Controllers = require('./Controllers'),
    _ = require('lodash');

var Resource = function(args) {
  args = args || {};
  this.app = args.app;
  this.sequelize = args.sequelize;

  if (!args.model)
    throw new Error('resource needs a model');

  this.model = args.model;
  this.include = args.include;
  this.actions = args.actions || ['create', 'read', 'update', 'delete', 'list'];
  this.endpoints = {
    plural: args.endpoints.shift(),
    singular: args.endpoints.shift()
  };
  this.updateMethod = args.updateMethod;

  this.controllers = {};
  this.actions.forEach(function(action) {
    var Controller = Controllers[action];
    var endpoint = this.endpoints[Controller.prototype.plurality];

    this.controllers[action] = new Controller({
      endpoint: endpoint,
      app: this.app,
      model: this.model,
      include: this.include,
      resource: this
    });

  }.bind(this));

  var hooks = Controllers.base.hooks;

  this.actions.forEach(function(action) {
    this[action] = this[action] || {};
    hooks.forEach(function(hook) {
      this[action][hook] = function(f) {
        this.controllers[action].milestone(hook, f);
      }.bind(this);
      this[action][hook].before = function(f) {
        this.controllers[action].milestone(hook + '_before', f);
      }.bind(this);
      this[action][hook].after = function(f) {
        this.controllers[action].milestone(hook + '_after', f);
      }.bind(this);
    }.bind(this));
  }.bind(this));

  this.all = {};

  hooks.forEach(function(hook) {
    this.all[hook] = function(f) {
      this.actions.forEach(function(action) {
        this.controllers[action].milestone(hook, f);
      }.bind(this));
    }.bind(this);
    this.all[hook].before = function(f) {
      this.actions.forEach(function(action) {
        this.controllers[action].milestone(hook + '_before', f);
      }.bind(this));
    }.bind(this);
    this.all[hook].after = function(f) {
      this.actions.forEach(function(action) {
        this.controllers[action].milestone(hook + '_after', f);
      }.bind(this));
    }.bind(this);

  }.bind(this));
};

Resource.prototype.use = function(middleware) {
  var self = this;
  self.actions.forEach(function(action) {
    if (_.has(middleware, action)) {
      _.forOwn(middleware[action], function(definition, milestone) {
        if (_.isFunction(definition)) {
          self[action][milestone](definition);
        } else {
          if (_.has(definition, 'action')) self[action][milestone](definition.action);
          if (_.has(definition, 'before')) self[action][milestone].before(definition.before);
          if (_.has(definition, 'after')) self[action][milestone].after(definition.after);
        }
      });
    }
  });

  if (_.has(middleware, 'extraConfiguration') && _.isFunction(middleware.extraConfiguration))
    middleware.extraConfiguration(this);
};

module.exports = Resource;
