'use strict';

var request = require('request'),
    expect = require('chai').expect,
    _ = require('lodash'),
    rest = require('../../lib'),
    test = require('../support');

describe('Resource(search)', function() {
  before(function() {
    test.models.User = test.db.define('users', {
      id: { type: test.Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      username: {
        type: test.Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: test.Sequelize.STRING,
        unique: { msg: 'must be unique' },
        validate: { isEmail: true }
      }
    }, {
      underscored: true,
      timestamps: false
    });

    test.userlist = [
      { username: 'arthur', email: 'arthur@gmail.com' },
      { username: 'james', email: 'james@gmail.com' },
      { username: 'henry', email: 'henry@gmail.com' },
      { username: 'william', email: 'william@gmail.com' },
      { username: 'edward', email: 'edward@gmail.com' },
      { username: 'arthur', email: 'aaaaarthur@gmail.com' }
    ];
  });

  beforeEach(function(done) {
    test.initializeDatabase(function() {
      test.initializeServer(function() {
        rest.initialize({
          app: test.app,
          sequelize: test.Sequelize
        });

        return test.models.User.bulkCreate(test.userlist).then(function() {
          done();
        });
      });
    });
  });

  afterEach(function(done) {
    test.clearDatabase(function() {
      test.server.close(done);
    });
  });

  [
    {
      name: 'with default options',
      config: {},
      query: 'gmail.com',
      expectedResults: [
        { username: 'arthur', email: 'arthur@gmail.com' },
        { username: 'james', email: 'james@gmail.com' },
        { username: 'henry', email: 'henry@gmail.com' },
        { username: 'william', email: 'william@gmail.com' },
        { username: 'edward', email: 'edward@gmail.com' },
        { username: 'arthur', email: 'aaaaarthur@gmail.com' }
      ]
    },
    {
      name: 'with custom search attributes',
      config: {
        search: {
          attributes: [ 'username' ]
        }
      },
      query: 'gmail.com',
      expectedResults: []
    },
    {
      name: 'with custom search param',
      config: {
        search: {
          param: 'search'
        }
      },
      query: 'william',
      expectedResults: [{ username: 'william', email: 'william@gmail.com' }]
    },
    {
      name: 'with custom search operator',
      config: {
        search: {
          operator: '$eq'
        }
      },
      query: 'william',
      expectedResults: [{ username: 'william', email: 'william@gmail.com' }]
    },
    {
      name: 'with custom search operator and attributes',
      config: {
        search: {
          operator: '$notLike',
          attributes: [ 'username' ]
        }
      },
      query: 'william',
      expectedResults: [
        { username: 'arthur', email: 'arthur@gmail.com' },
        { username: 'james', email: 'james@gmail.com' },
        { username: 'henry', email: 'henry@gmail.com' },
        { username: 'edward', email: 'edward@gmail.com' },
        { username: 'arthur', email: 'aaaaarthur@gmail.com' }]
    },
    {
      name: 'in combination with filtered results',
      config: {},
      query: 'aaaa&username=arthur',
      expectedResults: [{ username: 'arthur', email: 'aaaaarthur@gmail.com' }]
    },
    {
      name: 'with existing search criteria',
      config: {},
      preFlight: function(req, res, context) { 
        context.criteria = { username: "arthur" };
        return context.continue;
      },
      query: '@gmail.com',
      expectedResults: [
        { username: 'arthur', email: 'arthur@gmail.com' },
        { username: 'arthur', email: 'aaaaarthur@gmail.com' }
      ]
    }
  ].forEach(function(testCase) {
    it('should search ' + testCase.name, function(done) {
      var testResource = rest.resource(_.extend(testCase.config, {
        model: test.models.User,
        endpoints: ['/users', '/users/:id']
      }));

      var searchParam =
        testCase.config.search ? testCase.config.search.param || 'q' : 'q';

      if (testCase.preFlight)
        testResource.list.fetch.before(testCase.preFlight);
      
      request.get({
        url: test.baseUrl + '/users?' + searchParam + '=' + testCase.query
      }, function(err, response, body) {
        expect(response.statusCode).to.equal(200);
        var records = JSON.parse(body).map(function(r) { delete r.id; return r; });
        expect(records).to.eql(testCase.expectedResults);
        done();
      });
    });

  });

});
