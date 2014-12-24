'use strict';

var request = require('request'),
    expect = require('chai').expect,
    _ = require('lodash'),
    async = require('async'),
    rest = require('../../lib'),
    test = require('../support');

describe('Resource(associations)', function() {
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

    test.models.Person = test.db.define('person', {
      id: { type: test.Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: test.Sequelize.STRING, unique: true }
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.User.belongsTo(test.models.Address);  // user has an address_id
    test.models.Person.belongsTo(test.models.Address, {
      as: 'addy',
      foreignKey: 'addy_id'
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
          include: [test.models.Address],
          endpoints: ['/users', '/users/:id']
        });

        rest.resource({
          model: test.models.Person,
          include: [{ model: test.models.Address, as: 'addy' }],
          endpoints: ['/people', '/people/:id']
        });

        rest.resource({
          model: test.models.Address,
          endpoints: ['/addresses', '/addresses/:id']
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
  describe('read', function() {
    beforeEach(function(done) {
      request.post({
        url: test.baseUrl + '/addresses',
        json: { street: '221B Baker Street', state_province: 'London', postal_code: 'NW1', country_code: '44'}
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(201);
        var address = body;

        async.series([
          function(callback) {
            request.post({
              url: test.baseUrl + '/users',
              json: { username: 'sherlock', email: 'sherlock@holmes.com', address_id: address.id }
            }, function(error, response, body) {
              expect(response.statusCode).to.equal(201);
              callback();
            });
          },
          function(callback) {
            request.post({
              url: test.baseUrl + '/people',
              json: { name: 'barney', addy_id: address.id }
            }, function(error, response, body) {
              expect(response.statusCode).to.equal(201);
              done();
            });
          }
        ], done);

      });
    });

    it('should include prefetched data for relations', function(done) {
      request.get({
        url: test.baseUrl + '/users/1'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        var expected = {
          id: 1,
          username: 'sherlock',
          email: 'sherlock@holmes.com',
          address: {
            id: 1,
            street: '221B Baker Street',
            state_province: 'London',
            postal_code: 'NW1',
            country_code: '44'
          }
        };

        expect(result).to.eql(expected);
        done();
      });
    });

    it('should include prefetched data for an aliased relation', function(done) {
      request.get({
        url: test.baseUrl + '/people/1'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        var expected = {
          id: 1,
          name: 'barney',
          addy: {
            id: 1,
            street: '221B Baker Street',
            state_province: 'London',
            postal_code: 'NW1',
            country_code: '44'
          }
        };

        expect(result).to.eql(expected);
        done();
      });
    });

  });

  describe('list', function() {
    beforeEach(function(done) {
      test.expectedResult = [];
      var testData = [
        {
          user: { username: 'sherlock', email: 'sherlock@gmail.com' },
          address: { street: '221B Baker Street', state_province: 'London, UK', postal_code: 'NW1', country_code: '44'}
        },
        {
          user: { username: 'barack', email: 'barack@gmail.com' },
          address: { street: '1600 Pennsylvania Ave', state_province: 'Washington, DC', postal_code: '20500', country_code: '001'}
        },
        {
          user: { username: 'tony', email: 'tony@gmail.com' },
          address: { street: '633 Stag Trail RD', state_province: 'Caldwell, NJ', postal_code: '07006', country_code: '001'}
        },
        {
          user: { username: 'eddie', email: 'eddie@gmail.com' },
          address: { street: '1313 Mockingbird Ln', state_province: 'Lincoln, CA', postal_code: '95648', country_code: '001'}
        },
        {
          user: { username: 'lucy', email: 'lucy@gmail.com' },
          address: { street: '623 East 68th Street', state_province: 'New York, NY', postal_code: '10065', country_code: '001'}
        }
      ];

      async.each(testData, function(info, callback) {
        request.post({
          url: test.baseUrl + '/addresses',
          json: info.address
        }, function(error, response, body) {
          expect(response.statusCode).to.equal(201);
          var userData = info.user;
          var address = _.isObject(body) ? body : JSON.parse(body);
          userData.address_id = address.id;

          request.post({
            url: test.baseUrl + '/users',
            json: userData
          }, function(error, response, body) {
            expect(response.statusCode).to.equal(201);

            var record = body;
            record.address = address;
            delete record.address_id;
            test.expectedResult.push(record);
            callback();
          });
        });
      }, function(err) {
        expect(err).to.be.null;
        done();
      });
    });

    afterEach(function() {
      delete test.expectedResults;
    });

    it('should include prefetched data for relations', function(done) {
      request.get({ url: test.baseUrl + '/users' }, function(error, response, body) {
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql(test.expectedResult);
        done();
      });
    });

  });

});
