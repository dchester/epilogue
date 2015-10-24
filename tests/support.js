'use strict';

var Promise = require('bluebird'),
    Sequelize = require('sequelize'),
    http = require('http'),
    express = require('express'),
    bodyParser = require('body-parser'),
    restify = require('restify'),
    chai = require('chai');

var TestFixture = {
  models: {},
  Sequelize: Sequelize,

  initializeDatabase: function() {
    return TestFixture.db.sync({ force: true });
  },

  initializeServer: function() {
    if (process.env.USE_RESTIFY) {
      TestFixture.server = TestFixture.app = restify.createServer();
      TestFixture.server.use(restify.queryParser());
      TestFixture.server.use(restify.bodyParser());
    } else {
      TestFixture.app = express();
      TestFixture.app.use(bodyParser.json());
      TestFixture.app.use(bodyParser.urlencoded({ extended: false }));
      TestFixture.server = http.createServer(TestFixture.app);
    }

    return new Promise(function(resolve, reject) {
      TestFixture.server.listen(0, '127.0.0.1', function() {
        TestFixture.baseUrl =
          'http://' + TestFixture.server.address().address + ':' + TestFixture.server.address().port;
        resolve();
      });
    });
  },

  clearDatabase: function() {
    return TestFixture.db
      .getQueryInterface()
      .dropAllTables();
  },

  closeServer: function() {
    return new Promise(function(resolve, reject) {
      TestFixture.server.close(function(err) {
        if (!!err) return reject(err);
        resolve();
      });
    });
  }
};

before(function() {
  TestFixture.db = new Sequelize('main', null, null, {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: (process.env.SEQ_LOG ? console.log : false)
  });
});

// always print stack traces when an error occurs
chai.config.includeStack = true;

module.exports = TestFixture;
