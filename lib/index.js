"use strict";

var Resource = require('./Resource');
var Endpoint = require('./Endpoint');
var Controllers = require('./Controllers');

var epilogue = {
  initialize: function(args) {
    args = args || {};
    if (!args.app)
      throw new Error("please specify an app");

    this.app = args.app;
    this.base = args.base || '';
  },
  resource: function(args) {
    var endpoints = [];
    if (!args.model)
      throw new Error("please specify a valid model");

    args.endpoints.forEach(function(e) {
      var endpoint = this.base + e;
      endpoints.push(endpoint);
    }.bind(this));

    var resource = new Resource({
      app: this.app,
      model: args.model,
      endpoints: endpoints,
      actions: args.actions
    });

    return resource;
  },
  Resource: Resource,
  Endpoint: Endpoint,
  Controllers: Controllers
};

module.exports = epilogue;