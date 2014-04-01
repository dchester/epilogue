"use strict";

var express = require('express'),
    request = require('request'),
    http = require('http'),
    expect = require('chai').expect,
    Sequelize = require('sequelize'),
    _ = require('lodash'),
    rest = require('../lib');

var test = {};
describe('Resource(basic)', function() {
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
        test.app = express();
        test.app.use(express.json());
        test.app.use(express.urlencoded());

        rest.initialize({ app: test.app });
        rest.resource({
          model: test.User,
          endpoints: ['/users', '/users/:id']
        });

        test.server = http.createServer(test.app);
        test.server.listen(48281, null, null, function() {
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
  describe('construction', function() {
    it('should throw an exception if called with an invalid model', function(done) {
      expect(rest.resource).to.throw('please specify a valid model');
      done();
    });

    it('should throw an exception if created with an invalid model', function(done) {
      try {
        var resource = new rest.Resource();
      } catch (exception) {
        expect(exception).to.eql(new Error('resource needs a model'));
      }

      done();
    });
  });

  describe('create', function() {
    it('should create a record', function(done) {
      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'arthur', email: 'arthur@gmail.com' }
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(201);
        expect(response.headers.location).to.match(/\/users\/\d+/);
        done();
      });
    });

    it('should not create a record with invalid data', function(done) {
      request.post({
        url: test.baseUrl + '/users'
      }, function(error, response, body) {
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(response.statusCode).to.equal(400);
        expect(result).to.contain.keys('error');
        done();
      });
    });

  });

  describe('read', function() {
    it('should return 404 for invalid record', function(done) {
      request.get({ url: test.baseUrl + '/users/42' }, function(err, response, body) {
        expect(response.statusCode).to.equal(404);
        var record = _.isObject(body) ? body: JSON.parse(body);
        expect(record).to.contain.keys('error');
        done();
      });
    });

    it('should read a record', function(done) {
      var userData = { username: 'jamez', email: 'jamez@gmail.com' };
      request.post({
        url: test.baseUrl + '/users',
        json: userData
      }, function(error, response, body) {
        expect(error).is.null;
        expect(response.headers.location).is.not.empty;

        var path = response.headers.location;
        request.get({ url: test.baseUrl + path }, function(err, response, body) {
          expect(response.statusCode).to.equal(200);
          var record = _.isObject(body) ? body: JSON.parse(body);

          delete record.id;
          expect(record).to.eql(userData);
          done();
        });
      });
    });
  });

  describe('update', function() {
    it('should return 404 for invalid record', function(done) {
      request.put({ url: test.baseUrl + '/users/42' }, function(err, response, body) {
        expect(response.statusCode).to.equal(404);
        var record = _.isObject(body) ? body: JSON.parse(body);
        expect(record).to.contain.keys('error');
        done();
      });
    });

    it('should update a record', function(done) {
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

  describe('delete', function() {
    it('should return 404 for invalid record', function(done) {
      request.del({ url: test.baseUrl + '/users/42' }, function(err, response, body) {
        expect(response.statusCode).to.equal(404);
        var record = _.isObject(body) ? body: JSON.parse(body);
        expect(record).to.contain.keys('error');
        done();
      });
    });

    it('should delete a record', function(done) {
      var userData = { username: "chicken", email: "chicken@gmail.com" };
      request.post({
        url: test.baseUrl + '/users',
        json: userData
      }, function(error, response, body) {
        expect(error).is.null;
        expect(response.headers.location).is.not.empty;

        var path = response.headers.location;
        request.del({ url: test.baseUrl + path }, function(err, response, body) {
          expect(response.statusCode).to.equal(200);

          request.get({ url: test.baseUrl + path }, function(err, response, body) {
            expect(response.statusCode).is.equal(404);
            done();
          });
        });
      });
    });
  });

  describe('list', function() {
    beforeEach(function() {
      test.userlist = [
        { username: "arthur", email: "arthur@gmail.com" },
        { username: "james", email: "james@gmail.com" },
        { username: "henry", email: "henry@gmail.com" },
        { username: "william", email: "william@gmail.com" },
        { username: "edward", email: "edward@gmail.com" }
      ];

      _(test.userlist).forEach(function(data) {
        request.post({
          url: test.baseUrl + '/users',
          json: data
        }, function(error, response, body) {
          expect(response).to.not.be.null;
          expect(response.statusCode).to.equal(201);
          expect(response.headers.location).to.match(/\/users\/\d+/);
        });
      });
    });

    afterEach(function() {
      delete test.userlist;
    });

    it('should list all records', function(done) {
      request.get({ url: test.baseUrl + '/users' }, function(err, response, body) {
        expect(response.statusCode).to.equal(200);
        var records = JSON.parse(body).map(function(r) { delete r.id; return r; });
        expect(records).to.eql(test.userlist);
        expect(response.headers['content-range']).to.equal('items 0-4/5');
        done();
      });
    });

    it('should list some records using offset and count', function(done) {
      request.get({ url: test.baseUrl + '/users?offset=1&count=2' }, function(err, response, body) {
        expect(response.statusCode).to.equal(200);
        var records = JSON.parse(body).map(function(r) { delete r.id; return r; });
        expect(records).to.eql(test.userlist.slice(1,3));
        expect(response.headers['content-range']).to.equal('items 1-2/5');
        done();
      });
    });

  });

});
