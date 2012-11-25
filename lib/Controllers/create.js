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

	endpoint.attributes.forEach(function(attribute) {
		criteria[attribute] = req.params[attribute];
	});

	_(context.attributes).extend(_(req.body).clone());

	this.endpoint.attributes.forEach(function(a) {
		context.attributes[a] = req.params[a];
	});

	var instance = model.build(context.attributes);
	
	var err = instance.validate();
	if (err) {
		res.json(400, { error: err });
		return context.stop();
	}

	instance.save()
		.success(function(instance) {
			console.log("INSTANCE", instance);
			// TODO: add location header
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

