var Resource = require('./Resource');
var Endpoint = require('./Endpoint');
var Controllers = require('./Controllers');

var epilogue = {
	initialize: function(args) {
		args = args || {};
		if (!args.app) throw new Error("please specify an app");
		this.app = args.app;
	},
	resource: function(args) {
		var resource = new Resource({
			app: this.app,
			model: args.model,
			endpoints: args.endpoints
		});
		return resource;
	},
	Resource: Resource,
	Endpoint: Endpoint,
	Controllers: Controllers
};

module.exports = epilogue;

