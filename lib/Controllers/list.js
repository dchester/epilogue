var util = require('util');
var Base = require('./base');

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

	context.criteria = context.criteria || {};
	var criteria = context.criteria;

	endpoint.attributes.forEach(function(attribute) {
		criteria[attribute] = req.params[attribute];
	});

	var offset = context.offset || req.query.offset || 0;
	var count = context.count || req.query.count || 100;

	var options = { offset: offset, limit: count };

	if (Object.keys(criteria).length) {
		options.where = criteria;
	}

	model.findAll(options)
		.success(function(instance) {
			if (!instance) {
				res.json(404, { error: "not found" });
				return context.stop();
			}
			context.instance = instance;
			model.count()
				.success(function(count) {
					var start = offset * count;
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

