var async = require('async');
var Endpoint = require('../Endpoint');

var Controller = function(args) {
	this.initialize(args);
};

Controller.prototype.initialize = function(args) {

	this.endpoint = new Endpoint(args.endpoint);
	this.model = args.model;
	this.app = args.app;

	this.route();
};

Controller.hooks = [
	'start',
	'auth',
	'fetch',
	'data',
	'write',
	'send',
	'complete'
];

Controller.hooks.forEach(function(hook) {

	['_before', '', '_after'].forEach(function(modifier) {
		Controller.prototype[hook + modifier] = function(req, res, context) {
			context.continue();
		};
	});
});

Controller.prototype.error = function(req, res, context) {
	context.continue();
};

Controller.prototype.send = function(req, res, context) {
	res.json(context.instance);
	return context.continue();
};

Controller.prototype.route = function() {

	var app = this.app;
	var endpoint = this.endpoint;

	app[this.method](endpoint.string, function(req, res) {
		this._control(req, res);

	}.bind(this));
};

Controller.prototype._control = function(req, res) {

	var work = [];

	var _callback;

	var context = {
		instance: undefined,
		criteria: {},
		attributes: {},
		continue: function() { _callback() },
		stop: function() { _callback(true) }
	};

	Controller.hooks.forEach(function(hook) {

		[this[hook + "_before"], this[hook], this[hook + "_after"]].forEach(function(f, i) {

			work.push( function(callback) { 
				_callback = callback; 
				f.call(this, req, res, context);

			}.bind(this));
		}.bind(this));
	}.bind(this));

	async.series(
		work, 
		function(err, results) { 
			callback = function() {};
			if (err) { this.error(req, res, context) }

		}.bind(this)
	);
};

module.exports = Controller;

