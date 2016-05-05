'use strict';

var Promise = require('bluebird'),
  request = require('request'),
  expect = require('chai').expect,
  _ = require('lodash'),
  rest = require('../../lib'),
  test = require('../support');

describe('issue 161 - associated excludes', function () {
  before(function () {
    test.models.User = test.db.define('User', {
      name: test.Sequelize.STRING,
      last_name: test.Sequelize.STRING,
      password: test.Sequelize.STRING
    }, {timestamps: false,});
    test.models.Activity = test.db.define('Activity', {
      title: test.Sequelize.STRING,
      description: test.Sequelize.STRING
    }, {timestamps: false,});
    test.models.User.hasMany(test.models.Activity, {onDelete: 'cascade', hooks: true});
    test.models.Activity.belongsTo(test.models.User);
  });

  beforeEach(function () {
    return Promise.all([test.initializeDatabase(), test.initializeServer()])
      .then(function () {
        rest.initialize({app: test.app, sequelize: test.Sequelize});

        /*test.channelResource = rest.resource({
         model: test.models.Channel,
         associations: true,
         attributes: ['id','name'],
         endpoints: ['/api/channels', '/api/channels/:id']
         });*/

        return Promise.all([
            test.models.User.create({name: 'Paul', password: '123456', last_name: 'Runner'}),
            test.models.Activity.create({title: 'Run 19 miles', description: 'in 5 hours'}),
            test.models.Activity.create({title: 'pullups', description: 'do 10 pullups'})
          ])
          .spread(function (user, act1, act2) {
            return Promise.all([
              user.setActivities([act1, act2]),
              act1.setUser(user),
              act1.setUser(user)
            ]);
          });
      });
  });

  afterEach(function () {
    delete test.userResource;
    return test.clearDatabase()
      .then(function () {
        return test.closeServer();
      });
  });

  it('should work backward-compatible', function (done) {
    test.userResource = rest.resource({
      model: test.models.User,
      associations: true,
      excludeAttributes: ['password', 'last_name'],
      endpoints: ['/api/users', '/api/users/:id']
    });
    request.get({
      url: test.baseUrl + '/api/users'
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      expect(result).to.eql([{
        Activities: [
          {id: 1, title: 'Run 19 miles', description: 'in 5 hours', UserId: 1},
          {id: 2, title: 'pullups', description: 'do 10 pullups', UserId: 1},
        ],
        id: 1,
        name: 'Paul'
      }]);

      done();
    });
  });

  it('should work on excluded.own - object', function (done) {
    test.userResource = rest.resource({
      model: test.models.User,
      associations: true,
      excludeAttributes: {own: ['password', 'last_name']},
      endpoints: ['/api/users', '/api/users/:id']
    });
    request.get({
      url: test.baseUrl + '/api/users'
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      expect(result).to.eql([{
        Activities: [
          {id: 1, title: 'Run 19 miles', description: 'in 5 hours', UserId: 1},
          {id: 2, title: 'pullups', description: 'do 10 pullups', UserId: 1},
        ],
        id: 1,
        name: 'Paul'
      }]);

      done();
    });
  });

  it('should work on excludedAssociations', function (done) {
    test.userResource = rest.resource({
      model: test.models.User,
      associations: true,
      excludeAttributes: {
        Activities: ['description']
      },
      endpoints: ['/api/users', '/api/users/:id']
    });
    request.get({
      url: test.baseUrl + '/api/users'
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      expect(result).to.eql([{
        Activities: [
          {id: 1, title: 'Run 19 miles', UserId: 1},
          {id: 2, title: 'pullups', UserId: 1},
        ],
        id: 1, name: 'Paul', password: '123456', last_name: 'Runner'
      }]);

      done();
    });
  });

  it('should work on excludedAssociations AND own parameters', function (done) {
    test.userResource = rest.resource({
      model: test.models.User,
      associations: true,
      excludeAttributes: {
        own: ['name', 'password'],
        Activities: ['description']
      },
      endpoints: ['/api/users', '/api/users/:id']
    });
    request.get({
      url: test.baseUrl + '/api/users'
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      expect(result).to.eql([{
        Activities: [
          {id: 1, title: 'Run 19 miles', UserId: 1},
          {id: 2, title: 'pullups', UserId: 1},
        ],
        id: 1, last_name: 'Runner'
      }]);

      done();
    });
  });

});
