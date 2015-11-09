'use strict';

var Controllers = require('./Controllers'),
    hasOneResource = require('./associations/has-one'),
    hasManyResource = require('./associations/has-many'),
    belongsToResource = require('./associations/belongs-to'),
    belongsToManyResource = require('./associations/belongs-to-many'),
    _ = require('lodash');

var Resource = function(options) {
  _.defaults(options, {
    actions: ['create', 'read', 'update', 'delete', 'list'],
    pagination: true,
    reloadInstances: true,
    include: [],
    excludeAttributes: []
  });

  _.defaultsDeep(options, {
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
  this.include = options.include.map(function(include) {
    return include instanceof options.sequelize.Model ? { model: include } : include;
  });

  if (!!options.excludeAttributes) this.excludeAttributes = options.excludeAttributes;
  this.attributes = (!options.excludeAttributes.length) ?
    Object.keys(this.model.rawAttributes) :
    Object.keys(this.model.rawAttributes).filter(function(attr) {
      return options.excludeAttributes.indexOf(attr) === -1;
    });

  this.actions = options.actions;
  this.endpoints = {
    plural: options.endpoints[0],
    singular: options.endpoints[1] || options.endpoints[0]
  };
  this.updateMethod = options.updateMethod;
  this.pagination = options.pagination;
  this.search = options.search;
  this.sort = options.sort;
  this.reloadInstances = options.reloadInstances;

  this.associationOptions = {
    removeForeignKeys: false
  };

  if (!!options.associations) {
    if (_.isObject(options.associations)) {
      this.associationOptions = _.extend(this.associationOptions, options.associations);
    }
    autoAssociate(this);
  }

  this.controllers = {};
  this.actions.forEach(function(action) {
    var Controller = Controllers[action];
    var endpoint = this.endpoints[Controller.prototype.plurality];

    this.controllers[action] = new Controller({
      endpoint: endpoint,
      app: options.app,
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

  // cache association data for later use
  self.associationsInfo = {};
  if (self.include && self.include.length) {
    self.include.forEach(function(i) {
      var primaryKey = i.model.primaryKeyField,
          associations = _.values(self.model.associations).filter(function(a) {
            return a.target === i.model;
          });

      associations.forEach(function(association) {
        self.associationsInfo[association.identifier] = {
          identifier: association.identifier,
          primaryKey: primaryKey,
          as: association.as
        };
      });
    });
  }
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

function autoAssociate(resource) {
  if (!resource.model.associations)
    return;

  _.forEach(resource.model.associations, function(association) {
    // for prefetched data in list and read
    if (!!association.as) {
      resource.include.push({ model: association.target, as: association.as });
    } else {
      resource.include.push(association.target);
    }

    var subResourceName;
    if (association.associationType === 'HasOne') {
      subResourceName =
        association.target.options.name.singular.toLowerCase();
      resource[subResourceName] = hasOneResource(Resource, resource, association);
    } else if (association.associationType === 'HasMany') {
      subResourceName =
        association.target.options.name.plural.toLowerCase();
      resource[subResourceName] = hasManyResource(Resource, resource, association);
    } else if (association.associationType === 'BelongsTo') {
      subResourceName =
        association.target.options.name.singular.toLowerCase();
      resource[subResourceName] = belongsToResource(Resource, resource, association);
    } else if (association.associationType === 'BelongsToMany') {
     subResourceName =
       association.target.options.name.plural.toLowerCase();
     resource[subResourceName] = belongsToManyResource(Resource, resource, association);
    }
  });
}

module.exports = Resource;
