'use strict';

var Promise = require('bluebird'),
    request = require('request'),
    expect = require('chai').expect,
    _ = require('lodash'),
    rest = require('../../lib'),
    test = require('../support'),
    errors = require('../../lib/Errors'),
    RequestCompleted = errors.RequestCompleted,
    EpilogueError = errors.EpilogueError;

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
  describe('context.continue', function() {
    var ContinueMiddleware;

    beforeEach(function() {
      ContinueMiddleware = {
        results: {
          beforeCalled: false,
          actionCalled: false
        },
        create: {
          write: {
            action: function(req, res, context) {
              ContinueMiddleware.results.actionCalled = true;
              context.continue();
            }
          }
        }
      };
    });

    function checkContinued(done) {
      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'jamez', email: 'jamez@gmail.com' }
      }, function(err, response, body) {
        expect(ContinueMiddleware.results.beforeCalled).to.be.true;
        expect(ContinueMiddleware.results.actionCalled).to.be.true;
        done();
      });
    }

    it('should support running as a function', function(done) {
      ContinueMiddleware.create.write.before = function(req, res, context) {
        ContinueMiddleware.results.beforeCalled = true;
        context.continue();
      };

      test.userResource.use(ContinueMiddleware);
      checkContinued(done);
    });

    it('should support a return value', function(done) {
      ContinueMiddleware.create.write.before = function(req, res, context) {
        ContinueMiddleware.results.beforeCalled = true;
        return context.continue;
      };

      test.userResource.use(ContinueMiddleware);
      checkContinued(done);
    });

    it('should support returning a promise', function(done) {
      ContinueMiddleware.create.write.before = function(req, res, context) {
        ContinueMiddleware.results.beforeCalled = true;
        return new Promise(function(resolve) {
          resolve(context.continue);
        });
      };

      test.userResource.use(ContinueMiddleware);
      checkContinued(done);
    });
  });

  describe('context.stop', function() {
    var StopMiddleware;

    beforeEach(function() {
      StopMiddleware = {
        results: {
          beforeCalled: false,
          actionCalled: false
        },
        create: {
          write: {
            action: function(req, res, context) {
              StopMiddleware.results.actionCalled = true;
              context.continue();
            }
          }
        }
      };
    });

    function checkStopped(done) {
      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'jamez', email: 'jamez@gmail.com' }
      }, function(err, response, body) {
        expect(StopMiddleware.results.beforeCalled).to.be.true;
        expect(StopMiddleware.results.actionCalled).to.be.false;
        expect(response.statusCode).to.be.eql(420);
        done();
      });
    }

    function setResponse(res) {
      res.status(420);
      res.json({test: 'test'});
    }

    it('should support running as a function', function(done) {
      StopMiddleware.create.write.before = function(req, res, context) {
        StopMiddleware.results.beforeCalled = true;
        setResponse(res);
        context.stop();
      };

      test.userResource.use(StopMiddleware);
      checkStopped(done);
    });

    it('should support a return value', function(done) {
      StopMiddleware.create.write.before = function(req, res, context) {
        StopMiddleware.results.beforeCalled = true;
        setResponse(res);
        return context.stop;
      };

      test.userResource.use(StopMiddleware);
      checkStopped(done);
    });

    it('should support returning a promise', function(done) {
      StopMiddleware.create.write.before = function(req, res, context) {
        StopMiddleware.results.beforeCalled = true;
        return new Promise(function(resolve) {
          setResponse(res);
          resolve(context.stop);
        });
      };

      test.userResource.use(StopMiddleware);
      checkStopped(done);
    });

    it('should support thowing RequestCompleted error', function(done) {
      StopMiddleware.create.write.before = function(req, res, context) {
        StopMiddleware.results.beforeCalled = true;
        setResponse(res);
        throw new RequestCompleted();
      };

      test.userResource.use(StopMiddleware);
      checkStopped(done);
    });
  });

  describe('context.skip', function() {
    var SkipMiddleware;

    beforeEach(function() {
      SkipMiddleware = {
        results: {
          beforeCalled: false,
          actionCalled: false,
          sendCalled: false
        },
        create: {
          write: {
            action: function(req, res, context) {
              SkipMiddleware.results.actionCalled = true;
              context.continue();
            }
          },
          send: {
            action: function(req, res, context) {
              SkipMiddleware.results.sendCalled = true;
              context.continue();
            }
          }
        }
      };
    });

    function checkSkipped(done) {
      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'jamez', email: 'jamez@gmail.com' }
      }, function(err, response, body) {
        expect(SkipMiddleware.results.beforeCalled).to.be.true;
        expect(SkipMiddleware.results.actionCalled).to.be.false;
        expect(SkipMiddleware.results.sendCalled).to.be.true;
        done();
      });
    }

    it('should support running as a function', function(done) {
      SkipMiddleware.create.write.before = function(req, res, context) {
        SkipMiddleware.results.beforeCalled = true;
        context.skip();
      };

      test.userResource.use(SkipMiddleware);
      checkSkipped(done);
    });

    it('should support a return value', function(done) {
      SkipMiddleware.create.write.before = function(req, res, context) {
        SkipMiddleware.results.beforeCalled = true;
        return context.skip;
      };

      test.userResource.use(SkipMiddleware);
      checkSkipped(done);
    });

    it('should support returning a promise', function(done) {
      SkipMiddleware.create.write.before = function(req, res, context) {
        SkipMiddleware.results.beforeCalled = true;
        return new Promise(function(resolve) {
          resolve(context.skip);
        });
      };

      test.userResource.use(SkipMiddleware);
      checkSkipped(done);
    });
  });

  describe('throwing errors', function() {
    var ErrorMiddleware, error;

    beforeEach(function () {
      ErrorMiddleware = {
        results: {
          beforeCalled: false,
          actionCalled: false
        },
        create: {
          write: {
            action: function (req, res, context) {
              ErrorMiddleware.results.actionCalled = true;
              context.continue();
            }
          }
        }
      };
      error = new EpilogueError(420, 'test error', ['test', 'error']);
    });

    function checkErrored(done) {
      request.post({
        url: test.baseUrl + '/users',
        json: {username: 'jamez', email: 'jamez@gmail.com'}
      }, function (err, response, body) {
        expect(ErrorMiddleware.results.beforeCalled).to.be.true;
        expect(ErrorMiddleware.results.actionCalled).to.be.false;
        expect(response.statusCode).to.be.eql(error.status);
        expect(body.message).to.be.eql(error.message);
        expect(body.errors).to.be.eql(error.errors);
        done();
      });
    }

    it('should support throw in sync', function (done) {
      ErrorMiddleware.create.write.before = function (req, res, context) {
        ErrorMiddleware.results.beforeCalled = true;
        throw error;
      };

      test.userResource.use(ErrorMiddleware);
      checkErrored(done);
    });

    it('should support throwing in a promise', function (done) {
      ErrorMiddleware.create.write.before = function (req, res, context) {
        ErrorMiddleware.results.beforeCalled = true;
        return new Promise(function (resolve) {
          throw error;
        });
      };

      test.userResource.use(ErrorMiddleware);
      checkErrored(done);
    });

    it('should support context.error function when in a callback', function (done) {
      ErrorMiddleware.create.write.before = function (req, res, context) {
        ErrorMiddleware.results.beforeCalled = true;

        setTimeout(function() {
          context.error(error);
        }, 200);
      };

      test.userResource.use(ErrorMiddleware);
      checkErrored(done);
    });

    it('should support context.error function with error constructor arguments', function (done) {
      ErrorMiddleware.create.write.before = function (req, res, context) {
        ErrorMiddleware.results.beforeCalled = true;

        context.error(420, 'test error', ['test', 'error']);
      };

      test.userResource.use(ErrorMiddleware);
      checkErrored(done);
    });
  });

  describe('Errors', function() {
    it('should allow error messages to be changed before send', function(done) {
      var expectedBody = 'Expected Body';
      test.userResource.controllers.create.error = function(req, res, err) {
        res.status(400);
        res.send(expectedBody);
      };

      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'jamez', email: 'totally gonna fail email validation' }
      }, function(err, response, body) {
        expect(body).to.equal(expectedBody);
        expect(response.statusCode).to.equal(400);
        done();
      });
    });
  });

  describe('general behavior', function() {
    it('should not skip the before action of next milestone if an after resolved to skip', function(done) {
      var SkipMiddleware = {
        results: {
          beforeCalled: false,
          afterCalled: false
        },
        create: {
          write: {
            after: function(req, res, context) {
              SkipMiddleware.results.afterCalled = true;
              return context.skip;
            }
          },
          send: {
            before: function(req, res, context) {
              SkipMiddleware.results.beforeCalled = true;
              return context.continue;
            }
          }
        }
      };

      test.userResource.use(SkipMiddleware);
      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'jamez', email: 'jamez@gmail.com' }
      }, function(err, response, body) {
        expect(SkipMiddleware.results.afterCalled).to.be.true;
        expect(SkipMiddleware.results.beforeCalled).to.be.true;
        done();
      });
    });

    it('should skip the action and after hooks if skip is returned in before hook', function(done) {
      var SkipMiddleware = {
        results: {
          beforeCalled: false,
          actionCalled: false,
          afterCalled: false
        },
        create: {
          write: {
            before: function(req, res, context) {
              SkipMiddleware.results.beforeCalled = true;
              return context.skip;
            },
            action: function(req, res, context) {
              SkipMiddleware.results.actionCalled = true;
              return context.continue;
            },
            after: function(req, res, context) {
              SkipMiddleware.results.afterCalled = true;
              return context.continue;
            }
          }
        }
      };

      test.userResource.use(SkipMiddleware);
      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'jamez', email: 'jamez@gmail.com' }
      }, function(err, response, body) {
        expect(SkipMiddleware.results.beforeCalled).to.be.true;
        expect(SkipMiddleware.results.actionCalled).to.be.false;
        expect(SkipMiddleware.results.afterCalled).to.be.false;
        done();
      });
    });

    it('should throw an error on invalid milestone definition', function() {
      try {
        test.userResource.controllers.create.milestone('stert', function(req, res, context) {
        // no-op
        });
      } catch (error) {
        expect(error.message).to.equal('invalid milestone: stert');
      }
    });

  });

  describe('start', function() {
    // Run at the beginning of the request. Defaults to passthrough.
    it('should support chaining', function(done) {
      var startCount;
      test.userResource.read.start(function(req, res, context) {
        startCount = 1;
        return context.continue;
      });

      test.userResource.read.start(function(req, res, context) {
        startCount++;
        return context.continue;
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
        return context.skip;
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
        return context.skip;
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
  });

  describe('complete', function() {
    // Run the specified function when the request is complete, regardless of the status of the response.
  });

});
