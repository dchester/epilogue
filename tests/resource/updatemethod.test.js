'use strict';

var request = require('request'),
    expect = require('chai').expect,
    _ = require('lodash'),
    rest = require('../../lib'),
    test = require('../support');

describe('Resource(updateMethod)', function() {
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
      test.initializeServer(done);
    });
  });

  afterEach(function(done) {
    test.clearDatabase(function() {
      test.server.close(done);
    });
  });

  // TESTS
  describe('patch', function() {
    it('should allow for PATCH as an update method', function(done) {
      rest.initialize({
        app: test.app,
        sequelize: test.Sequelize,
        updateMethod: 'patch'
      });

      rest.resource({
        model: test.models.User,
        endpoints: ['/users', '/users/:id']
      });

      var userData = { username: 'jamez', email: 'jamez@gmail.com' };
      request.post({
        url: test.baseUrl + '/users',
        json: userData
      }, function(error, response, body) {
        expect(error).is.null;
        expect(response.headers.location).is.not.empty;
        var path = response.headers.location;
        request.patch({
          url: test.baseUrl + path,
          json: { email: 'emma@fmail.co.uk' }
        }, function(err, response, body) {
          expect(response.statusCode).to.equal(200);
          var record = _.isObject(body) ? body : JSON.parse(body);

          delete record.id;
          userData.email = 'emma@fmail.co.uk';
          expect(record).to.eql(userData);
          done();
        });
      });
    });
  });

  describe('put', function() {
    it('should allow for PUT as an update method', function(done) {
      rest.initialize({
        app: test.app,
        sequelize: test.Sequelize,
        updateMethod: 'put'
      });

      rest.resource({
        model: test.models.User,
        endpoints: ['/users', '/users/:id']
      });

      var userData = { username: 'jamez', email: 'jamez@gmail.com' };
      request.post({
        url: test.baseUrl + '/users',
        json: userData
      }, function(error, response, body) {
        expect(error).is.null;
        expect(response.headers.location).is.not.empty;
        var path = response.headers.location;
        request.put({
          url: test.baseUrl + path,
          json: { email: 'emma@fmail.co.uk' }
        }, function(err, response, body) {
          expect(response.statusCode).to.equal(200);
          var record = _.isObject(body) ? body : JSON.parse(body);

          delete record.id;
          userData.email = 'emma@fmail.co.uk';
          expect(record).to.eql(userData);
          done();
        });
      });
    });
  });

  describe('post', function() {
    it('should allow for POST as an update method', function(done) {
      rest.initialize({
        app: test.app,
        sequelize: test.Sequelize,
        updateMethod: 'post'
      });

      rest.resource({
        model: test.models.User,
        endpoints: ['/users', '/users/:id']
      });

      var userData = { username: 'jamez', email: 'jamez@gmail.com' };
      request.post({
        url: test.baseUrl + '/users',
        json: userData
      }, function(error, response, body) {
        expect(error).is.null;
        expect(response.headers.location).is.not.empty;
        var path = response.headers.location;
        request.post({
          url: test.baseUrl + path,
          json: { email: 'emma@fmail.co.uk' }
        }, function(err, response, body) {
          expect(response.statusCode).to.equal(200);
          var record = _.isObject(body) ? body : JSON.parse(body);

          delete record.id;
          userData.email = 'emma@fmail.co.uk';
          expect(record).to.eql(userData);
          done();
        });
      });
    });
  });

});
