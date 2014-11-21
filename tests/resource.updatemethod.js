"use strict";

var express = require('express'),
    restify = require('restify'),
    request = require('request'),
    http = require('http'),
    expect = require('chai').expect,
    Sequelize = require('sequelize'),
    _ = require('lodash'),
    rest = require('../lib');

var test = {};
describe('Resource(updateMethod)', function() {
  before(function() {
    test.db = new Sequelize('main', null, null, {
      dialect: 'sqlite',
      logging: false
    });

    test.User = test.db.define('users', {
      id:       { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      username: { type: Sequelize.STRING, unique: true },
      email:    { type: Sequelize.STRING, unique: true, validate: { isEmail: true } }
    }, {
      underscored: true,
      timestamps: false
    });
  });

  beforeEach(function(done) {
    test.db
      .sync({ force: true })
      .success(function() {
        if (process.env.USE_RESTIFY) {
          test.server = test.app = restify.createServer();
          test.server.use(restify.queryParser());
          test.server.use(restify.bodyParser());
        } else {
          test.app = express();
          test.app.use(express.json());
          test.app.use(express.urlencoded());
          test.server = http.createServer(test.app);
        }

        test.server.listen(48281, function() {
          test.baseUrl =
            'http://' + test.server.address().address + ':' + test.server.address().port;
          done();
        });
      });
  });

  afterEach(function(done) {
    test.db
      .getQueryInterface()
      .dropAllTables()
      .success(function() {
        test.server.close(done);
      });
  });

  // TESTS
  describe('patch', function() {
    it('should allow for PATCH as an update method', function(done) {
      rest.initialize({
        app: test.app,
        sequelize: Sequelize,
        updateMethod: 'patch',
      });

      rest.resource({
        model: test.User,
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
          var record = _.isObject(body) ? body: JSON.parse(body);

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
        sequelize: Sequelize,
        updateMethod: 'put',
      });

      rest.resource({
        model: test.User,
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
          var record = _.isObject(body) ? body: JSON.parse(body);

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
        sequelize: Sequelize,
        updateMethod: 'post',
      });

      rest.resource({
        model: test.User,
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
          var record = _.isObject(body) ? body: JSON.parse(body);

          delete record.id;
          userData.email = 'emma@fmail.co.uk';
          expect(record).to.eql(userData);
          done();
        });
      });
    });
  });

});
