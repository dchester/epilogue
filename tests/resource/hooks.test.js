'use strict';

var request = require('request'),
    expect = require('chai').expect,
    _ = require('lodash'),
    rest = require('../../lib'),
    inflection = require('inflection'),
    test = require('../support');

test.hooks = {};
['create', 'update', 'destroy'].forEach(function(verb) {
  test.hooks[verb] = {};
  if (verb !== 'destroy') {
    test.hooks[verb].beforeValidate = false;
    test.hooks[verb].afterValidate = false;
  }

  test.hooks[verb]['before' + inflection.capitalize(verb)] = false;
  test.hooks[verb]['after' + inflection.capitalize(verb)] = false;
});

test.tests = {
  create: function(options) {
    options.enableTest();

    request.post({
      url: test.baseUrl + '/users',
      json: { username: 'arthur', email: 'arthur@gmail.com' }
    }, function(error, response, body) {
      var record = _.isObject(body) ? body : JSON.parse(body);
      expect(record.errors).to.be.ok;
      expect(record.errors[0]).to.equal(options.expectedError);
      options.afterTest();
    });
  },

  update: function(options) {
    request.post({
      url: test.baseUrl + '/users',
      json: { username: 'jamez', email: 'jamez@gmail.com' }
    }, function(error, response, body) {
      expect(error).is.null;
      expect(response.headers.location).is.not.empty;

      var path = response.headers.location;

      options.enableTest();
      request.put({
        url: test.baseUrl + path,
        json: { email: 'emma@fmail.co.uk' }
      }, function(err, response, body) {
        expect(response.statusCode).to.equal(500);
        var record = _.isObject(body) ? body : JSON.parse(body);
        expect(record.errors).to.be.ok;
        expect(record.errors[0]).to.equal(options.expectedError);
        options.afterTest();
      });
    });
  },

  destroy: function(options) {
    request.post({
      url: test.baseUrl + '/users',
      json: { username: 'chicken', email: 'chicken@gmail.com' }
    }, function(error, response, body) {
      expect(error).is.null;
      expect(response.headers.location).is.not.empty;
      var path = response.headers.location;

      options.enableTest();
      request.del({
        url: test.baseUrl + path
      }, function(err, response, body) {
        expect(response.statusCode).to.equal(500);
        var record = _.isObject(body) ? body : JSON.parse(body);
        expect(record.errors).to.be.ok;
        expect(record.errors[0]).to.equal(options.expectedError);
        options.afterTest();
      });
    });
  }
};

describe('Resource(hooks)', function() {
  before(function() {
    test.models.User = test.db.define('users', {
      id: { type: test.Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      username: {
        type: test.Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: test.Sequelize.STRING,
        unique: { msg: 'must be unique' },
        validate: { isEmail: true }
      }
    });

    Object.keys(test.hooks).forEach(function(verb) {
      Object.keys(test.hooks[verb]).forEach(function(hook) {
        test.models.User.hook(hook, function(instance, options, callback) {
          if (test.hooks[verb][hook])
            throw new Error(verb + "#" + hook);
          callback();
        });
      });
    });

  });

  beforeEach(function(done) {
    test.initializeDatabase(function() {
      test.initializeServer(function() {
        rest.initialize({
          app: test.app,
          sequelize: test.Sequelize
        });

        rest.resource({
          model: test.models.User,
          endpoints: ['/users', '/users/:id']
        });

        done();
      });
    });
  });

  afterEach(function(done) {
    test.clearDatabase(function() {
      test.server.close(done);
    });
  });

  // TESTS
  Object.keys(test.hooks).forEach(function(verb) {
    describe(verb, function() {
      Object.keys(test.hooks[verb]).forEach(function(hook) {
        it(hook, function(done) {
          var expectedError = verb + '#' + hook;
          test.tests[verb]({
            expectedError: expectedError,
            enableTest: function() {
              test.hooks[verb][hook] = true;
            },
            afterTest: function() {
              test.hooks[verb][hook] = false;
              done();
            }
          });
        });
      });
    });
  });

});
