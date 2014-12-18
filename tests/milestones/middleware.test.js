'use strict';

var request = require('request'),
    expect = require('chai').expect,
    _ = require('lodash'),
    rest = require('../../lib'),
    test = require('../support'),
    testMiddleware = require('./data/test-middleware'),
    testMiddlewareBeforeAndAfter = require('./data/test-middleware-before-after');

function verifyBeforeAndAfter(object) {
  expect(object.action).to.be.true;
  expect(object.before).to.be.true;
  expect(object.after).to.be.true;
}

describe('Milestones(middleware)', function() {
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

  _.forOwn({
    'without before and after': testMiddleware,
    'with before and after': testMiddlewareBeforeAndAfter
  }, function(middleware, description) {

    describe(description, function() {
      beforeEach(function(done) {
        rest.initialize({
          app: test.app,
          sequelize: test.Sequelize
        });

        test.userResource = rest.resource({
          model: test.models.User,
          endpoints: ['/users', '/users/:id']
        });

        test.userResource.use(middleware);
        expect(middleware.results.extraConfiguration).to.be.true;

        done();
      });

      it('should allow definitions for create milestones', function(done) {
        request.post({
          url: test.baseUrl + '/users',
          json: { username: 'jamez', email: 'jamez@gmail.com' }
        }, function(err, response, body) {
          expect(err).to.be.null;
          expect(response.statusCode).to.equal(201);
          _.forOwn(middleware.results.create, function(result, milestone) {
            if (middleware === testMiddlewareBeforeAndAfter) {
              verifyBeforeAndAfter(middleware.results.create[milestone]);
            } else {
              expect(middleware.results.create[milestone]).to.be.true;
            }
          });

          done();
        });
      });

      it('should allow definitions for list milestones', function(done) {
        request.get({
          url: test.baseUrl + '/users'
        }, function(err, response, body) {
          _.forOwn(middleware.results.list, function(result, milestone) {
            if (middleware === testMiddlewareBeforeAndAfter) {
              verifyBeforeAndAfter(middleware.results.list[milestone]);
            } else {
              expect(middleware.results.list[milestone]).to.be.true;
            }
          });

          done();
        });
      });

      it('should allow definitions for read milestones', function(done) {
        request.post({
          url: test.baseUrl + '/users',
          json: { username: 'jamez', email: 'jamez@gmail.com' }
        }, function(err, response, body) {
          expect(err).to.be.null;
          expect(response.statusCode).to.equal(201);
          var record = _.isObject(body) ? body : JSON.parse(body);
          request.get({
            url: test.baseUrl + '/users/' + record.id
          }, function(err, response, body) {
            _.forOwn(middleware.results.read, function(result, milestone) {
              if (middleware === testMiddlewareBeforeAndAfter) {
                verifyBeforeAndAfter(middleware.results.read[milestone]);
              } else {
                expect(middleware.results.read[milestone]).to.be.true;
              }
            });

            done();
          });
        });
      });

      it('should allow definitions for update milestones', function(done) {
        request.post({
          url: test.baseUrl + '/users',
          json: { username: 'jamez', email: 'jamez@gmail.com' }
        }, function(err, response, body) {
          expect(err).to.be.null;
          expect(response.statusCode).to.equal(201);
          var record = _.isObject(body) ? body : JSON.parse(body);

          request.put({
            url: test.baseUrl + '/users/' + record.id,
            json: { username: 'another', email: 'name@gmail.com' }
          }, function(err, response, body) {
            _.forOwn(middleware.results.update, function(result, milestone) {
              if (middleware === testMiddlewareBeforeAndAfter) {
                verifyBeforeAndAfter(middleware.results.update[milestone]);
              } else {
                expect(middleware.results.update[milestone]).to.be.true;
              }
            });

            done();
          });
        });
      });

      it('should allow definitions for delete milestones', function(done) {
        request.post({
          url: test.baseUrl + '/users',
          json: { username: 'jamez', email: 'jamez@gmail.com' }
        }, function(err, response, body) {
          expect(err).to.be.null;
          expect(response.statusCode).to.equal(201);
          var record = _.isObject(body) ? body : JSON.parse(body);

          request.del({
            url: test.baseUrl + '/users/' + record.id
          }, function(err, response, body) {
            _.forOwn(middleware.results.delete, function(result, milestone) {
              if (middleware === testMiddlewareBeforeAndAfter) {
                verifyBeforeAndAfter(middleware.results.delete[milestone]);
              } else {
                expect(middleware.results.delete[milestone]).to.be.true;
              }
            });

            done();
          });
        });
      });
    });
  });
});
