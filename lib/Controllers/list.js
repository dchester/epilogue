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

	context.criteria = {};

	endpoint.attributes.forEach(function(attribute) {
		criteria[attribute] = req.params[attribute];
	});

	model.findAll()
		.success(function(instance) {
			if (!instance) {
				return yield([404, "not found"]);
			}
			context.instance = instance;
			return context.continue();
		})
		.error(function(err) {
			res.json(500, { error: err });
			return context.stop();
		});
};

module.exports = List;

