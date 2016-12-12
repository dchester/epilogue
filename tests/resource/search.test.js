'use strict';

var Promise = require('bluebird'),
    request = require('request'),
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

    test.models.Task = test.db.define("task", {
      name: test.Sequelize.STRING,
      finished: test.Sequelize.BOOLEAN,
      priority: test.Sequelize.INTEGER
    }, {
      scopes: {
        finishedLowPriority : {
          where: {
            finished: true,
            priority: 1
          }
        }
      },
      underscored: true,
      timestamps: false
    });

    test.userlist = [
      { username: 'arthur', email: 'arthur@gmail.com' },
      { username: 'james', email: 'james@gmail.com' },
      { username: 'henry', email: 'henry@gmail.com' },
      { username: 'william', email: 'william@gmail.com' },
      { username: 'edward', email: 'edward@gmail.com' },
      { username: 'arthur', email: 'aaaaarthur@gmail.com' },
      { username: '123', email: 'mike@gmail.com' }
    ];

    test.tasklist = [
      { name: 'run', finished: true, priority: 2 },
      { name: 'do laundry', finished: false, priority: 4 },
      { name: 'wake up', finished: true, priority: 1 },
      { name: 'eat lunch', finished: false, priority: 3 }
    ];
  });

  beforeEach(function() {
    return Promise.all([ test.initializeDatabase(), test.initializeServer() ])
      .then(function() {
        rest.initialize({ app: test.app, sequelize: test.Sequelize });
        return Promise.all([
          test.models.User.bulkCreate(test.userlist),
          test.models.Task.bulkCreate(test.tasklist)
        ]);
      });
  });

  afterEach(function() {
    return test.clearDatabase()
      .then(function() { return test.closeServer(); });
  });

  [
    {
      name: 'search with default options',
      config: {},
      query: 'gmail.com',
      expectedResults: [
        { username: 'arthur', email: 'arthur@gmail.com' },
        { username: 'james', email: 'james@gmail.com' },
        { username: 'henry', email: 'henry@gmail.com' },
        { username: 'william', email: 'william@gmail.com' },
        { username: 'edward', email: 'edward@gmail.com' },
        { username: 'arthur', email: 'aaaaarthur@gmail.com' },
        { username: '123', email: 'mike@gmail.com' }
      ]
    },
    {
      name: 'search with custom search attributes',
      config: {
        search: {
          attributes: [ 'username' ]
        }
      },
      query: 'gmail.com',
      expectedResults: []
    },
    {
      name: 'search with custom search attributes, number search for type STRING',
      config: {
        search: {
          attributes: [ 'username' ]
        }
      },
      query: '123',
      expectedResults: [{ username: '123', email: 'mike@gmail.com' }]
    },
    {
      name: 'search with custom search param',
      config: {
        search: {
          param: 'search'
        }
      },
      query: 'william',
      expectedResults: [{ username: 'william', email: 'william@gmail.com' }]
    },
    {
      name: 'search with custom search operator',
      config: {
        search: {
          operator: '$eq'
        }
      },
      query: 'william',
      expectedResults: [{ username: 'william', email: 'william@gmail.com' }]
    },
    {
      name: 'search with custom search operator and attributes',
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
        { username: 'arthur', email: 'aaaaarthur@gmail.com' },
        { username: '123', email: 'mike@gmail.com' }
      ]
    },
    {
      name: 'search in combination with filtered results',
      config: {},
      query: 'aaaa&username=arthur',
      expectedResults: [{ username: 'arthur', email: 'aaaaarthur@gmail.com' }]
    },
    {
      name: 'search with existing search criteria',
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
    },
    {
      name: 'filter by query when multiple parameters',
      config: {
        model: function() { return test.models.User; },
        search: [
          { param: 'name', attributes: ['username']},
          { param: 'q'}
        ]
      },
      query: 'hur',
      expectedResults: [
        { username: 'arthur', email: 'arthur@gmail.com' },
        { username: 'arthur', email: 'aaaaarthur@gmail.com' }
      ]
    },
    {
      name: 'filter by boolean attribute',
      config: {
        model: function() { return test.models.Task; },
        endpoints: ['/tasks', '/tasks/:id']
      },
      extraQuery: 'finished=true',
      expectedResults: [
        { name: 'run', finished: true, priority: 2 },
        { name: 'wake up', finished: true, priority: 1 },
      ]
    },
    {
      name: 'filter by string attribute',
      config: {
        model: function() { return test.models.Task; },
        endpoints: ['/tasks', '/tasks/:id']
      },
      extraQuery: 'name=run',
      expectedResults: [
        { name: 'run', finished: true, priority: 2 }
      ]
    },
    {
      name: 'filter by integer attribute',
      config: {
        model: function() { return test.models.Task; },
        endpoints: ['/tasks', '/tasks/:id']
      },
      extraQuery: 'priority=3',
      expectedResults: [
        { name: 'eat lunch', finished: false, priority: 3 }
      ]
    },
    {
      name: 'filter by multiple parameters',
      config: {
        model: function() { return test.models.Task; },
        endpoints: ['/tasks', '/tasks/:id'],
        search: [
          {param: 'task-name', attributes: ['name']}
        ]
      },
      extraQuery: 'task-name=lunch',
      expectedResults: [
        { name: 'eat lunch', finished: false, priority: 3 }
      ]
    },
    {
      name: 'filter by scope',
      config: {
        model: function() { return test.models.Task; },
        endpoints: ['/tasks', '/tasks/:id']
      },
      extraQuery: 'scope=finishedLowPriority',
      expectedResults: [
        { name: 'wake up', finished: true, priority: 1 }
      ]
    }
  ].forEach(function(testCase) {
    it('should ' + testCase.name, function(done) {
      if (!!testCase.config.model && _.isFunction(testCase.config.model)) {
        testCase.config.model = testCase.config.model();
      }

      var resourceConfig = _.defaults(testCase.config, {
        model: test.models.User,
        endpoints: ['/users', '/users/:id']
      });

      var testResource = rest.resource(resourceConfig);
      var searchParam =
        testCase.config.search ? testCase.config.search.param || 'q' : 'q';

      var queryString = '';
      if (!!testCase.query) {
        queryString = searchParam + '=' + testCase.query;
        if (!!testCase.extraQuery) queryString = queryString + '&';
      }
      if (!!testCase.extraQuery) queryString = queryString + testCase.extraQuery;

      if (testCase.preFlight)
        testResource.list.fetch.before(testCase.preFlight);

      request.get({
        url: test.baseUrl + resourceConfig.endpoints[0] + '?' + queryString
      }, function(err, response, body) {
        expect(response.statusCode).to.equal(200);
        var records = JSON.parse(body).map(function(r) { delete r.id; return r; });
        expect(records).to.eql(testCase.expectedResults);
        done();
      });
    });

  });

});
