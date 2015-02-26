'use strict';

var Controllers = require('./Controllers'),
    _ = require('lodash');

var Resource = function(options) {
  options = _.defaults(options, {
    actions: ['create', 'read', 'update', 'delete', 'list'],
    pagination: true,
    search: {
      param: 'q'
    },
    sort: {
      param: 'sort'
    }
  });

  this.app = options.app;
  this.sequelize = options.sequelize;
  this.model = options.model;
  this.include = options.include;
  this.actions = options.actions;
  this.endpoints = {
    plural: options.endpoints.shift(),
    singular: options.endpoints.shift()
  };
  this.updateMethod = options.updateMethod;
  this.pagination = options.pagination;
  this.search = options.search;
  this.sort = options.sort;

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

  var hooks = Controllers.base.hooks,
      self = this;

  this.actions.forEach(function(action) {
    self[action] = self[action] || {};
    hooks.forEach(function(hook) {
      self[action][hook] = function(f) {
        self.controllers[action].milestone(hook, f);
      };

      self[action][hook].before = function(f) {
        self.controllers[action].milestone(hook + '_before', f);
      };

      self[action][hook].after = function(f) {
        self.controllers[action].milestone(hook + '_after', f);
      };
    });
  });

  this.all = {};

  hooks.forEach(function(hook) {
    self.all[hook] = function(f) {
      self.actions.forEach(function(action) {
        self.controllers[action].milestone(hook, f);
      });
    };

    self.all[hook].before = function(f) {
      self.actions.forEach(function(action) {
        self.controllers[action].milestone(hook + '_before', f);
      });
    };

    self.all[hook].after = function(f) {
      self.actions.forEach(function(action) {
        self.controllers[action].milestone(hook + '_after', f);
      });
    };

  });
};

Resource.prototype.use = function(middleware) {
  var self = this,
      actions = _.clone(self.actions);

  actions.push('all');
  actions.forEach(function(action) {
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
