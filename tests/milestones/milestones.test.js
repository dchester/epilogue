'use strict';

var request = require('request'),
    expect = require('chai').expect,
    _ = require('lodash'),
    rest = require('../../lib'),
    test = require('../support');

describe('Milestones', function() {
  before(function() {
    test.models.User = test.db.define('users', {
      id: { type: test.Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      username: { type: test.Sequelize.STRING, unique: true },
      email: { type: test.Sequelize.STRING, unique: true, validate: { isEmail: true } }
    }, {
      underscored: true,
      timestamps: false
    });
  });

  beforeEach(function(done) {
    test.initializeDatabase(function() {
      test.initializeServer(function() {
        rest.initialize({
          app: test.app,
          sequelize: test.Sequelize
        });

        test.userResource = rest.resource({
          model: test.models.User,
          endpoints: ['/users', '/users/:id']
        });

        done();
      });
    });
  });

  afterEach(function(done) {
    test.clearDatabase(function() {
      test.server.close(function() {
        delete test.userResource;
        done();
      });
    });
  });

  // TESTS
  describe('start', function() {
    // Run at the beginning of the request. Defaults to passthrough.
    it('should support chaining', function(done) {
      var startCount;
      test.userResource.read.start(function(req, res, context) {
        startCount = 1;
        return context.continue();
      });

      test.userResource.read.start(function(req, res, context) {
        startCount++;
        return context.continue();
      });

      request.get({ url: test.baseUrl + '/users/1' }, function(err, response, body) {
        expect(startCount).to.equal(2);
        done();
      });
    });

  });

  describe('auth', function() {
    // Authorize the request. Defaults to passthrough.
  });

  describe('fetch', function() {
    // Fetch data from the database for non-create actions according to context.criteria, writing to context.instance.

    it('should support overriding data for create before fetch', function(done) {
      var mockData = { username: 'mocked', email: 'mocked@gmail.com' };
      test.userResource.read.fetch.before(function(req, res, context) {
        context.instance = mockData;
        return context.skip();
      });

      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'jamez', email: 'jamez@gmail.com' }
      }, function(err, response, body) {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(201);

        var path = response.headers.location;
        request.get({ url: test.baseUrl + path }, function(err, response, body) {
          var record = _.isObject(body) ? body : JSON.parse(body);
          delete record.id;
          expect(response.statusCode).to.equal(200);
          expect(record).to.eql(mockData);
          done();
        });
      });
    });

    it('should support modifying data for create after fetch', function(done) {
      var expected = { username: 'jamez', email: 'injected@email.com' };
      test.userResource.read.fetch.after(function(req, res, context) {
        context.instance.email = 'injected@email.com';
        return context.skip();
      });

      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'jamez', email: 'jamez@gmail.com' }
      }, function(err, response, body) {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(201);

        var path = response.headers.location;
        request.get({ url: test.baseUrl + path }, function(err, response, body) {
          var record = _.isObject(body) ? body : JSON.parse(body);
          delete record.id;
          expect(response.statusCode).to.equal(200);
          expect(record).to.eql(expected);
          done();
        });
      });
    });
  });

  describe('data', function() {
    // Transform the data from the database if needed. Defaults to passthrough.
  });

  describe('write', function() {
    // Write to the database for actions that write, reading from context.attributes.
  });

  describe('send', function() {
    // Send the HTTP response, headers along with the data in context.instance.

    it('should support modifying error data on create before sending response', function(done) {
      var expected = { error: 'Injected error message' };
      test.userResource.create.send.before(function(req, res, context) {
        if (context.error !== undefined) {
          context.error = expected;
        }
        context.continue();
      });

      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'jamez', email: 'not an email address' }
      }, function(err, response, body) {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(400);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql(expected);
        done();
      });
    });

    it('should support modifying error data on update before sending response', function(done) {
      var expected = { error: 'Injected error message' };
      test.userResource.update.send.before(function(req, res, context) {
        if (context.error !== undefined) {
          context.error = expected;
        }
        context.continue();
      });

      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'jamez', email: 'jamez@gmail.com' }
      }, function(err, response, body) {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(201);

        var path = response.headers.location;
        request.put({
          url: test.baseUrl + path,
          json: { email: 'not an email address' }
        }, function(err, response, body) {
          expect(err).to.be.null;
          expect(response.statusCode).to.equal(400);
          var result = _.isObject(body) ? body : JSON.parse(body);
          expect(result).to.eql(expected);
          done();
        });
      });
    });

    it('should support modifying error data on delete before sending response', function(done) {
      var expected = { error: 'Injected error message' };
      test.userResource.delete.send.before(function(req, res, context) {
        if (context.error !== undefined) {
          context.error = expected;
        }
        context.continue();
      });

      request.del({
        url: test.baseUrl + '/users/-1'
      }, function(err, response, body) {
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(response.statusCode).to.equal(404);
        expect(result).to.eql(expected);
        done();
      });
    });
  });

  describe('complete', function() {
    // Run the specified function when the request is complete, regardless of the status of the response.
  });

});
