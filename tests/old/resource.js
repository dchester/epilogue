var fs = require('fs'),
  http = require('http'),
  async = require('async'),
  express = require('express'),
  request = require('request'),
  rest = require('../lib'),
  User = require('./lib/user.js'),
  Address = require('./lib/address.js'),
  switchboard = {};

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
  }, function() {
    switchboard.server.close(callback);
  });
};

module.exports = {
  create: function(test) {
    request.post({
      url: "http://localhost:48281/users",
      json: { username: "arthur", email: "arthur@gmail.com" }

    }, function(err, response, body) {

      if (err) console.log("ERROR: " + err);

      test.equal(response.statusCode, 201, "we get a created 201 for creating an entry");
      test.ok(response.headers['location'].match(/\/users\/\d+/), "we get plausible location header");
      test.done();
    });
  },

  read: function(test) {
    request.post({
      url: "http://localhost:48281/users",
      json: { username: "jamez", email: "jamez@gmail.com" }
    }, function(err, response, body) {
      if (err)
        console.log("ERROR: " + err);

      var path = response.headers['location'];      
      request.get({ url: "http://localhost:48281" + path }, function(err, response, body) {

        var record = typeof body == 'string' ? JSON.parse(body) : body;
        delete record.id;

        var user = { "username": "jamez", "email": "jamez@gmail.com" };

        test.equal(response.statusCode, 200, "get back results");
        test.deepEqual(record, user, "we created one user successfully");

        test.done();
      });
    });
  },

  list: function(test) {

    var list = [
      { username: "arthur", email: "arthur@gmail.com" },
      { username: "james", email: "james@gmail.com" },
      { username: "henry", email: "henry@gmail.com" },
      { username: "william", email: "william@gmail.com" },
      { username: "edward", email: "edward@gmail.com" }
    ];

    async.forEachSeries(
      list,
      function(user, callback) {
        request.post({
          url: "http://localhost:48281/users",
          json: user
        },
        function(err, response, body) {
          callback();
        });
      },
      function(err) {

        async.parallel([
          function(callback) {
            request.get({ url: "http://localhost:48281/users" }, function(err, response, body) {
              test.equal(response.statusCode, 200, "list comes back okay");
              var records = JSON.parse(body).map(function(r) { delete r.id; return r });
              test.deepEqual(records, list, "list gets back what we put in");
              test.equal(response.headers['content-range'], 'items 0-4/5', "list content range checks out");
              callback();
            });
          },
          function(callback) {
            request.get({ url: "http://localhost:48281/users?offset=1&count=2" }, function(err, response, body) {
              test.equal(200, response.statusCode, "paginated list okay");
              var records = JSON.parse(body).map(function(r) { delete r.id; return r });
              test.deepEqual(records, list.slice(1,3), "paginated list gets right elements");
              test.equal(response.headers['content-range'], 'items 1-2/5', "paginated list content range okay");
              callback();
            });
          }
        ],
        function(err) {
          test.done();
        });
      });
  },

  update: function(test) {
    request.post({
      url: "http://localhost:48281/users",
      json: { username: "emma", email: "emma@gmail.com" }
    }, function(err, response, body) {
      if (err) console.log("ERROR: " + err);

      var location = response.headers['location'];

      request.post({
        url: "http://localhost:48281" + location,
        json: { email: "emma@fmail.co.uk" }
      }, function(err, response, body) {
        if (err) console.log("ERROR: " + err);

        var record = typeof body == 'string' ? JSON.parse(body) : body;
        delete record.id;

        var user = { "username": "emma", "email": "emma@fmail.co.uk" };
        test.equal(response.statusCode, 200, "updating gets successful status");
        test.deepEqual(record, user, "updated user is updated");
        test.done();
      });
    });
  },

  delete: function(test) {
    request.post({
      url: "http://localhost:48281/users",
      json: { username: "chicken", email: "chicken@gmail.com" }

    }, function(err, response, body) {

      if (err) console.log("ERROR: " + err);

      var location = response.headers['location'];

      request.del({ url: "http://localhost:48281" + location }, function(err, response, body) {

        test.equal(response.statusCode, 200, "deleting a user gets successful status");

        request.get({ url: "http://localhost:48281" + location }, function(err, response, body) {

          test.equal(response.statusCode, 404, "deleted user is deleted");
          test.done();
        });
      });
    });
  },

  setUp: function(callback) {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded());  

    User.hasMany(Address);

    User.sync();
    Address.sync();

    rest.initialize({ app: app });

    rest.resource({
      model: User,
      endpoints: ['/users', '/users/:id']
    });

    switchboard.server = http.createServer(app);
    switchboard.server.listen(48281, null, null, callback);
  },

  tearDown: function(callback) {
    truncate(callback);
  }
};
