'use strict';

var util = require('util'),
    Base = require('./base'),
    _ = require('lodash');

var List = function(args) {
  List.super_.call(this, args);
};

util.inherits(List, Base);

List.prototype.action = 'list';
List.prototype.method = 'get';
List.prototype.plurality = 'plural';

List.prototype.fetch = function(req, res, context) {
  var model = this.model,
      endpoint = this.endpoint,
      criteria = context.criteria || {},
      include = this.include,
      includeAttributes = this.includeAttributes,
      Sequelize = this.resource.sequelize,
      defaultCount = 100,
      count = +context.count || +req.query.count || defaultCount,
      offset = +context.offset || +req.query.offset || 0;

  endpoint.attributes.forEach(function(attribute) {
    criteria[attribute] = req.params[attribute];
  });

  offset += context.page * count || req.query.page * count || 0;
  if (count > 1000) count = 1000;
  if (count < 0) count = defaultCount;

  var options = { offset: offset, limit: count };
  if (include.length) {
    options.include = include;
    options.attributes =
      Object.keys(model.rawAttributes).filter(function(attr) {
        return includeAttributes.indexOf(attr) === -1;
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

  if (req.query.sort) {
    var order = [];
    var sortColumns = req.query.sort.split(',');
    _(sortColumns).forEach(function(sortColumn) {
      if (sortColumn.indexOf('-') === 0) {
        order.push([sortColumn.substring(1), 'DESC']);
      } else {
        order.push([sortColumn, 'ASC']);
      }
    });

    if (order.length)
      options.order = order;
  }

  // all other query parameters are passed to search
  var extraSearchCriteria = _.reduce(req.query, function(result, value, key) {
    if (_.has(model.rawAttributes, key)) result[key] = value;
    return result;
  }, {});

  if (Object.keys(extraSearchCriteria).length)
    criteria = _.assign(extraSearchCriteria, criteria);

  // do the actual lookup
  if (Object.keys(criteria).length)
    options.where = criteria;

  model
    .findAndCountAll(options)
    .then(function(result) {
      if (!result.rows) {
        // TODO: support outside-of-range errors
        res.json(404, { error: 'not found' });
        return context.stop();
      }

      context.instance = result.rows;
      var start = offset;
      var end = start + result.rows.length - 1;
      end = end === -1 ? 0 : end;
      res.header('Content-Range', 'items ' + [[start, end].join('-'), result.count].join('/'));
      return context.continue();

    })
    .catch(function(err) {
      res.json(500, { error: err });
      return context.stop();
    });
};

module.exports = List;
