'use strict';

var request = require('request'),
    expect = require('chai').expect,
    _ = require('lodash'),
    rest = require('../../lib'),
    test = require('../support'),
    Promise = test.Sequelize.Promise;

describe('Associations(HasMany)', function() {
  before(function() {
    test.models.User = test.db.define('users', {
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
          endpoints: ['/users', '/users/:id'],
          associations: true
        });

        Promise.all([
          test.models.User.create({ name: 'sumo' }),
          test.models.User.create({ name: 'ninja' }),
          test.models.Task.create({ name: 'eat' }),
          test.models.Task.create({ name: 'sleep' }),
          test.models.Task.create({ name: 'eat again' }),
          test.models.Task.create({ name: 'fight' })
        ]).spread(function(user, user2, task1, task2, task3, task4) {
          return user.setTasks([task1, task2, task3]).then(function() {
            user2.setTasks([task4]).then(function() {
              done();
            });
          });
        });

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
    it('should return associated data by url', function(done) {
      request.get({
        url: test.baseUrl + '/users/1/tasks/1'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql({ id: 1, name: 'eat' });
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
          { id: 1, name: 'eat' },
          { id: 2, name: 'sleep' },
          { id: 3, name: 'eat again' }
        ]);

        done();
      });
    });

    it('should return associated data by url (2)', function(done) {
      request.get({
        url: test.baseUrl + '/users/2/tasks'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql([
          { id: 4, name: 'fight' }
        ]);

        done();
      });
    });
  });

});
