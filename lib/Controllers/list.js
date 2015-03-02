'use strict';

var util = require('util'),
    Base = require('./base'),
    _ = require('lodash'),
    errors = require('../Errors');

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

  offset += context.page * count || req.query.page * count || 0;
  if (count > 1000) count = 1000;
  if (count < 0) count = defaultCount;

  var options = { offset: offset, limit: count };
  if (!this.resource.pagination)
    delete options.limit;

  if (include.length) {
    options.include = include;
    options.attributes =
      Object.keys(model.rawAttributes).filter(function(attr) {
        return includeAttributes.indexOf(attr) === -1;
      });
  }

  var searchParam = this.resource.search.param;
  if (_.has(req.query, searchParam)) {
    var search = [];
    var searchAttributes =
      this.resource.search.attributes || Object.keys(model.rawAttributes);
    searchAttributes.forEach(function(attr) {
      var item = {};
      item[attr] = { like: '%' + req.query[searchParam] + '%' };
      search.push(item);
    });

    if (Object.keys(criteria).length)
      criteria = Sequelize.and(criteria, Sequelize.or.apply(null, search));
    else
      criteria = Sequelize.or.apply(null, search);
  }

  var sortParam = this.resource.sort.param;
  if (_.has(req.query, sortParam)) {
    var order = [];
    var columnNames = [];
    var sortColumns = req.query[sortParam].split(',');
    sortColumns.forEach(function(sortColumn) {
      if (sortColumn.indexOf('-') === 0) {
        var actualName = sortColumn.substring(1);
        order.push([actualName, 'DESC']);
        columnNames.push(actualName);
      } else {
        columnNames.push(sortColumn);
        order.push([sortColumn, 'ASC']);
      }
    });
    var allowedColumns = this.resource.sort.attributes || Object.keys(model.rawAttributes);
    var disallowedColumns = _.difference(columnNames, allowedColumns);
    if (disallowedColumns.length) {
      throw new errors.BadRequestError('Sorting not allowed on given attributes', disallowedColumns);
    }

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

  var self = this;
  return model
    .findAndCountAll(options)
    .then(function(result) {
      context.instance = result.rows;
      var start = offset;
      var end = start + result.rows.length - 1;
      end = end === -1 ? 0 : end;

      if (!!self.resource.pagination)
        res.header('Content-Range', 'items ' + [[start, end].join('-'), result.count].join('/'));

      return context.continue;
    });
};

module.exports = List;
