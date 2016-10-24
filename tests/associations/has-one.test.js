'use strict';

var Promise = require('bluebird'),
    request = require('request'),
    expect = require('chai').expect,
    _ = require('lodash'),
    rest = require('../../lib'),
    test = require('../support');

describe('Associations(HasOne)', function() {
  before(function() {
    test.models.User = test.db.define('users', {
      id: { type: test.Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      username: { type: test.Sequelize.STRING, unique: true },
      email: { type: test.Sequelize.STRING, unique: true, validate: { isEmail: true } }
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.Address = test.db.define('addresses', {
      id: { type: test.Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      street: { type: test.Sequelize.STRING },
      state_province: { type: test.Sequelize.STRING },
      postal_code: { type: test.Sequelize.STRING },
      country_code: { type: test.Sequelize.STRING }
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.User.hasOne(test.models.Address);
  });

  beforeEach(function() {
    return Promise.all([ test.initializeDatabase(), test.initializeServer() ])
      .then(function() {
        rest.initialize({
          app: test.app,
          sequelize: test.Sequelize
        });

        test.resource = rest.resource({
          model: test.models.User,
          endpoints: ['/users', '/users/:id'],
          associations: true
        });

        return Promise.all([
          test.models.Address.create({
            street: '221B Baker Street',
            state_province: 'London',
            postal_code: 'NW1',
            country_code: '44'
          }),
          test.models.Address.create({
            street: 'Avenue de l\'Atomium',
            state_province: 'Brussels',
            postal_code: '1020',
            country_code: '32'
          }),
          test.models.User.create({
            username: 'sherlock',
            email: 'sherlock@holmes.com'
          }),
          test.models.User.create({
            username: 'MannekenPis',
            email: 'manneken.pis@brussels.be'
          })
        ]).spread(function(address, address2, user, user2) {
          return user.setAddress(address).then(function() {
            return user2.setAddress(address2);
          });
        });

      });
  });

  afterEach(function() {
    return test.clearDatabase()
      .then(function() { return test.closeServer(); });
  });

  // TESTS
  describe('parent read', function() {

    it('should return associated data in same request', function (done) {
      request.get({
        url: test.baseUrl + '/users/1'
      }, function (error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        var expected = {
          id: 1,
          username: "sherlock",
          email: "sherlock@holmes.com",
          address: {
            id: 1,
            street: '221B Baker Street',
            state_province: 'London',
            postal_code: 'NW1',
            country_code: '44',
            user_id: 1
          }
        };

        expect(result).to.eql(expected);
        done();
      });
    });

    it('should return associated data in same request (2)', function (done) {
      request.get({
        url: test.baseUrl + '/users/2'
      }, function (error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        var expected = {
          id: 2,
          username: "MannekenPis",
          email: "manneken.pis@brussels.be",
          address: {
            id: 2,
            street: 'Avenue de l\'Atomium',
            state_province: 'Brussels',
            postal_code: '1020',
            country_code: '32',
            user_id: 2
          }
        };

        expect(result).to.eql(expected);
        done();
      });
    });
  });

  describe('read', function() {

    it('should return associated data by url', function(done) {
      request.get({
        url: test.baseUrl + '/users/1/address'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        var expected = {
          id: 1,
          street: '221B Baker Street',
          state_province: 'London',
          postal_code: 'NW1',
          country_code: '44',
          user_id: 1
        };

        expect(result).to.eql(expected);
        done();
      });
    });

    it('should return associated data by url without foreign keys', function(done) {
      test.resource.associationOptions.removeForeignKeys = true;
      request.get({
        url: test.baseUrl + '/users/1/address'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        var expected = {
          id: 1,
          street: '221B Baker Street',
          state_province: 'London',
          postal_code: 'NW1',
          country_code: '44'
        };

        expect(result).to.eql(expected);
        test.resource.associationOptions.removeForeignKeys = false;
        done();
      });
    });

    it('should return associated data by url (2)', function(done) {
      request.get({
        url: test.baseUrl + '/users/2/address'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        var expected = {
          id: 2,
          street: 'Avenue de l\'Atomium',
          state_province: 'Brussels',
          postal_code: '1020',
          country_code: '32',
          user_id: 2
        };

        expect(result).to.eql(expected);
        done();
      });
    });

    it('should return associated data by url without foreign keys (2)', function(done) {
      test.resource.associationOptions.removeForeignKeys = true;
      request.get({
        url: test.baseUrl + '/users/2/address'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        var expected = {
          id: 2,
          street: 'Avenue de l\'Atomium',
          state_province: 'Brussels',
          postal_code: '1020',
          country_code: '32'
        };

        expect(result).to.eql(expected);
        test.resource.associationOptions.removeForeignKeys = false;
        done();
      });
    });

  });

});
