var _ = require('underscore');
var util = require('util');

var Base = require('./base');

var Create = function(args) {
	Create.super_.call(this, args);
};

util.inherits(Create, Base);

Create.prototype.action = 'create';
Create.prototype.method = 'post';
Create.prototype.plurality = 'plural';

Create.prototype.write = function(req, res, context) {

	var model = this.model;
	var endpoint = this.endpoint;

	var criteria = {};

	_(context.attributes).extend(_(req.body).clone());

	this.endpoint.attributes.forEach(function(a) {
		if (req.params.hasOwnProperty(a)) {
			context.attributes[a] = req.params[a];
		}
	});

	var instance = model.build(context.attributes);
	
	var err = instance.validate();
	if (err) {
		res.json(400, { error: err });
		return context.stop();
	}

	var resource = this.resource;

	instance.save()
		.success(function(instance) {

			if (resource) {
				var endpoint = resource.endpoints.singular;
				var location = endpoint.replace(/:(\w+)/g, function(match, $1) { return instance[$1] });
				res.header('Location', location);
			}

			res.status(201);
			context.instance = instance;
			return context.continue();

		})
		.error(function(err) {
			res.json(500, { error: err });
			return context.stop();
		});
};

module.exports = Create;

