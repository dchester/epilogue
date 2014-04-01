"use strict";

var util = require('util'),
    Base = require('./base');

var List = function(args) {
  List.super_.call(this, args);
};

util.inherits(List, Base);

List.prototype.action = 'list';
List.prototype.method = 'get';
List.prototype.plurality = 'plural';

List.prototype.fetch = function(req, res, context) {
  var model = this.model;
  var endpoint = this.endpoint;
  var criteria = context.criteria || {};
  var include = this.include;
  var includeAttributes = this.includeAttributes;
  var Sequelize = this.resource.sequelize;

  endpoint.attributes.forEach(function(attribute) {
    criteria[attribute] = req.params[attribute];
  });

  var defaultCount = 100;
  var count = +context.count || +req.query.count || defaultCount;
  var offset = +context.offset || +req.query.offset || 0;
  offset += context.page*count || req.query.page*count || 0;

  if (count > 1000) count = 1000;
  if (count < 0) count = defaultCount;
    
  var options = { offset: offset, limit: count };
  if (include.length) {
    options.include = include;
    options.attributes =
      Object.keys(model.rawAttributes).filter(function(attr) {
        return includeAttributes.indexOf(attr);
      });
  }

  if (req.query.q) {
    var search = [];
    Object.keys(model.rawAttributes).forEach(function(attr) {
      var item = {};
      item[attr] = { like: '%' + req.query.q + '%' };
      search.push(item);
    });

    if (Object.keys(criteria).length)
      criteria = Sequelize.and(criteria, Sequelize.or.apply(null, search));
    else
      criteria = Sequelize.or.apply(null, search);
  }

  if (Object.keys(criteria).length) {
    options.where = criteria;
  }

  model
    .findAll(options)
    .success(function(instance) {
      if (!instance) {
        // TODO: support outside-of-range errors
        res.json(404, { error: "not found" });
        return context.stop();
      }

      context.instance = instance;
      model
        .count({where: options.where})
        .success(function(count) {
          var start = offset;
          var end = start + instance.length - 1;
          res.header('Content-Range', "items " + [ [start, end].join('-'), count ].join('/'));
          return context.continue();
        });
    })
    .error(function(err) {
      res.json(500, { error: err });
      return context.stop();
    });
};

module.exports = List;
