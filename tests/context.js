var fs = require('fs');
var http = require('http');
var async = require('async');
var express = require('express');
var request = require('request');

var rest = require('../lib');
var User = require('./lib/user.js');
var Address = require('./lib/address.js');

var switchboard = {};

var truncate = function(callback) {

	async.forEach([User, Address], function(model, callback) {

		model.findAll()
			.success(function(instances) {
				async.forEach(instances, function(instance, callback) {
					instance.destroy();
					callback();
				},
				function() {
					callback();
				});
			})
	},
	function() {
		switchboard.server.close(callback);
	});
};

module.exports = {

	prefetch: function(test) {
		request.post({
			url: "http://localhost:48281/users",
			json: { username: "jamez", email: "jamez@gmail.com" }

		}, function(err, response, body) {

			if (err) console.log("ERROR: " + err);

			var path = response.headers['location'];

			request.get({ url: "http://localhost:48281" + path }, function(err, response, body) {

				var record = typeof body == 'string' ? JSON.parse(body) : body;
				delete record.id;

				var user = { "username": "mocked", "email": "mocked@gmail.com" };

				test.equal(response.statusCode, 200, "get back results");
				test.deepEqual(record, user, "skipped fetching instance");

				test.done();
			});
		});
	},

	multipleStarts: function(test) {

		var users = switchboard.users;

		var startCount;

		users.read.start(function(req, res, context) {
			startCount = 1;
			return context.continue();
		});

		users.read.start(function(req, res, context) {
			startCount++;
			return context.continue();
		});

		request.get({ url: "http://localhost:48281/users/1" }, function(err, response, body) {
			test.equal(startCount, 2);
			test.done();
		});
	},

	setUp: function(callback) {

		var app = express();
		app.use(express.bodyParser());

		User.hasMany(Address);

		User.sync();
		Address.sync();

		rest.initialize({ app: app });

		var users = rest.resource({
			model: User,
			endpoints: ['/users', '/users/:id']
		});

		users.read.fetch.before(function(req, res, context) {
			context.instance = { username: "mocked", email: "mocked@gmail.com" };
			return context.skip();
		});

		switchboard.users = users;

		switchboard.server = http.createServer(app);
		switchboard.server.listen( 48281, null, null, function() { setTimeout(callback, 1000) });
	},

	tearDown: function(callback) {
		truncate(callback);
	}
};


