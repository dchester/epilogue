var express = require('express'),
    request = require('request'),
    http = require('http'),
    expect = require('chai').expect,
    Sequelize = require('sequelize'),
    _ = require('lodash'),
    rest = require('../lib');

var test = {};
describe('Resource(milestones)', function() {
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
        test.userResource = rest.resource({
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
        test.server.close(function() {
          delete test.userResource;
          done();
        });
      });
  });

  // TESTS
  describe('start', function() {
    // Run at the beginning of the request. Defaults to passthrough.
    it('should support chaining', function(done) {
      var startCount;
      test.userResource.read.start(function(req, res, context) {
        startCount = 1;
        return context.continue();
      });

      test.userResource.read.start(function(req, res, context) {
        startCount++;
        return context.continue();
      });

      request.get({ url: test.baseUrl + '/users/1' }, function(err, response, body) {
        expect(startCount).to.equal(2);
        done();
      });
    });

  });

  describe('fetch', function() {
    // Fetch data from the database for non-create actions according to context.criteria, writing to context.instance.
    
    it('should support overriding data for create', function(done) {
      var mockData = { username: 'mocked', email: 'mocked@gmail.com' };
      test.userResource.read.fetch.before(function(req, res, context) {
        context.instance = mockData;
        return context.skip();
      });

      request.post({
        url: test.baseUrl + '/users',
        json: { username: 'jamez', email: 'jamez@gmail.com' }
      }, function(err, response, body) {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(201);

        var path = response.headers['location'];
        request.get({ url: test.baseUrl + path }, function(err, response, body) {
          var record = _.isObject(body) ? body : JSON.parse(body);
          delete record.id;
          expect(response.statusCode).to.equal(200);
          expect(record).to.eql(mockData);
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
