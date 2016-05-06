'use strict';

var Promise = require('bluebird'),
  request = require('request'),
  expect = require('chai').expect,
  _ = require('lodash'),
  rest = require('../../lib'),
  test = require('../support');

describe('issue 117 - use _defaults to extend array on hooks', function () {
  before(function () {
    test.models.Printer = test.db.define('Printer',
      {
        name: test.Sequelize.STRING,
        extrusion: test.Sequelize.STRING,
        extruders: test.Sequelize.INTEGER,
        firmware: test.Sequelize.STRING,
        comment: test.Sequelize.STRING
      }, {timestamps: false,});
  });

  beforeEach(function () {
    return Promise.all([test.initializeDatabase(), test.initializeServer()])
      .then(function () {
        rest.initialize({app: test.app, sequelize: test.Sequelize});

        test.printerResource = rest.resource({
          model: test.models.Printer,
          endpoints: ['/api/printers', '/api/printers/:id'],
          hooks: true
        });

        // set hooks to modify incoming context
        test.printerResource.create.write.before(function (req, res, context) {
          // modify context attributes "comment"
          context.attributes.comment = "CREATION COMMENT CHANGED BEFORE WRITE";
          context.continue();
        });

        test.printerResource.update.write.before(function (req, res, context) {
          // modify context attributes "comment"
          context.attributes.comment = "UPDATE COMMENT CHANGED BEFORE WRITE";
          //req.body.comment = "UPDATE COMMENT CHANGED BEFORE WRITE";
          context.continue();
        });

        return Promise.all([
          test.models.Printer.create({
            name: 'Prusa i3',
            extrusion: "direct drive",
            extruders: 1,
            firmware: "Marlin",
            comment: "default setup"
          })
        ]);
      });
  });

  afterEach(function () {
    return test.clearDatabase()
      .then(function () {
        return test.closeServer();
      });
  });

  it('should be able to modify a created record before write', function (done) {
    request.post({
      url: test.baseUrl + '/api/printers',
      json: {
        name: 'My shiny new MPCNC',
        extrusion: "none",
        extruders: "none",
        firmware: "Marlin modified",
        comment: ""
      }
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(201);
      var result = _.isObject(body) ? body : JSON.parse(body);
      expect(result).to.eql({
        id: 2,
        name: 'My shiny new MPCNC',
        extrusion: "none",
        extruders: "none",
        firmware: "Marlin modified",
        comment: "CREATION COMMENT CHANGED BEFORE WRITE"
      });

      done();
    });
  });

  it('should be able to modify an updated record before write', function (done) {
    request.put({
      url: test.baseUrl + '/api/printers/1',
      json: {
        name: 'My shiny new MPCNC',
        extrusion: "one",
        extruders: 1,
        firmware: "Marlin modified",
        comment: ""
      }
    }, function (error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      console.log(result);
      expect(result).to.eql({
        id: 1,
        name: 'My shiny new MPCNC',
        extrusion: "one",
        extruders: 1,
        firmware: "Marlin modified",
        comment: "UPDATE COMMENT CHANGED BEFORE WRITE"
      });

      done();
    });
  });
});
