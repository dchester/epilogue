'use strict';

var Promise = require('bluebird'),
    request = require('request'),
    expect = require('chai').expect,
    _ = require('lodash'),
    rest = require('../../lib'),
    test = require('../support');

describe('Associations(HasMany)', function() {
  before(function() {
    test.models.User = test.db.define('users', {
      name: test.Sequelize.STRING
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.App = test.db.define('apps', {
      name: test.Sequelize.STRING
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.Task = test.db.define('tasks', {
      name: test.Sequelize.STRING
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.User.hasMany(test.models.Task);
    test.models.App.hasMany(test.models.User);
    test.models.User.belongsTo(test.models.App);
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
          test.models.User.create({ name: 'sumo' }),
          test.models.User.create({ name: 'ninja' }),
          test.models.Task.create({ name: 'eat' }),
          test.models.Task.create({ name: 'sleep' }),
          test.models.Task.create({ name: 'eat again' }),
          test.models.Task.create({ name: 'fight' })
        ]).spread(function(user, user2, task1, task2, task3, task4) {
          return Promise.all([
            user.setTasks([task1, task2, task3]),
            user2.setTasks([task4])
          ]);
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
        expect(result).to.eql({
          "app": null,
          "app_id": null,
          "id": 1,
          "name": "sumo",
          "tasks": [
            {id: 1, name: 'eat', user_id: 1},
            {id: 2, name: 'sleep', user_id: 1},
            {id: 3, name: 'eat again', user_id: 1}
          ]
        });
        done();
      });
    });

    it('should return associated data in same request (2)', function (done) {
      request.get({
        url: test.baseUrl + '/users/2'
      }, function (error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql({
          "app": null,
          "app_id": null,
          "id": 2,
          "name": "ninja",
          "tasks": [
            {id: 4, name: 'fight', user_id: 2}
          ]
        });
        done();
      });
    });
  });

  describe('read', function() {

    it('should return associated data by url', function(done) {
      request.get({
        url: test.baseUrl + '/users/1/tasks/1'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql({ id: 1, name: 'eat', user_id: 1 });
        done();
      });
    });

    it('should return associated data by url without foreign keys', function(done) {
      test.resource.associationOptions.removeForeignKeys = true;
      request.get({
        url: test.baseUrl + '/users/1/tasks/1'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql({ id: 1, name: 'eat' });

        test.resource.associationOptions.removeForeignKeys = false;
        done();
      });
    });
  });

  describe('list', function() {
    it('should return associated data by url', function(done) {
      request.get({
        url: test.baseUrl + '/users/1/tasks'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql([
          { id: 1, name: 'eat', user_id: 1 },
          { id: 2, name: 'sleep', user_id: 1 },
          { id: 3, name: 'eat again', user_id: 1 }
        ]);

        done();
      });
    });

    it('should return associated data by url without foreign keys', function(done) {
      test.resource.associationOptions.removeForeignKeys = true;
      request.get({
        url: test.baseUrl + '/users/1/tasks'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql([
          { id: 1, name: 'eat' },
          { id: 2, name: 'sleep' },
          { id: 3, name: 'eat again' }
        ]);

        test.resource.associationOptions.removeForeignKeys = false;
        done();
      });
    });

    it('should return associated data by url (2)', function(done) {
      request.get({
        url: test.baseUrl + '/users/2/tasks'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql([ { id: 4, name: 'fight', user_id: 2 } ]);

        done();
      });
    });

    it('should return associated data by url without foreign keys (2)', function(done) {
      test.resource.associationOptions.removeForeignKeys = true;
      request.get({
        url: test.baseUrl + '/users/2/tasks'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql([ { id: 4, name: 'fight' } ]);

        test.resource.associationOptions.removeForeignKeys = false;
        done();
      });
    });


  });

});
