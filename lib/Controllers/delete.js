'use strict';

var util = require('util'),
    Base = require('./base'),
    ReadController = require('./read');

var Delete = function(args) {
  Delete.super_.call(this, args);
};

util.inherits(Delete, Base);

Delete.prototype.action = 'delete';
Delete.prototype.method = 'delete';
Delete.prototype.plurality = 'singular';

Delete.prototype.fetch = ReadController.prototype.fetch;

Delete.prototype.write = function(req, res, context) {
  return context.instance
    .destroy()
    .then(function() {
      context.instance = {};
      return context.continue;
    });
};

module.exports = Delete;
