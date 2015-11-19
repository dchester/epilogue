'use strict';

var Sequelize = require('sequelize'),
    epilogue = require('../lib'),
    expect = require('chai').expect;

describe('Epilogue', function() {
  it('should throw an exception when initialized without arguments', function(done) {
    expect(epilogue.initialize).to.throw('please specify an app');
    done();
  });

  it('should throw an exception when initialized without a sequelize instance', function(done) {
    expect(epilogue.initialize.bind(epilogue, {
      app: {}
    })).to.throw('please specify a sequelize instance');
    done();
  });

  it('should throw an exception when initialized with an invalid sequelize instance', function(done) {
    expect(epilogue.initialize.bind(epilogue, {
      app: {},
      sequelize: {},
    })).to.throw('invalid sequelize instance');
    done();
  });

  it('should throw an exception with an invalid updateMethod', function(done) {
    expect(epilogue.initialize.bind(epilogue, {
      app: {},
      sequelize: {version: 0, STRING:0, TEXT:0, and: 0, or: 0},
      updateMethod: 'dogs'
    })).to.throw('updateMethod must be one of PUT, POST, or PATCH');
    done();
  });

  it('should allow the user to pass in a sequelize instance rather than prototype', function() {
    var db = new Sequelize('main', null, null, {
      dialect: 'sqlite',
      storage: ':memory:',
      logging: (process.env.SEQ_LOG ? console.log : false)
    });

    epilogue.initialize({
      app: {},
      sequelize: db
    });

    // required sequelize parameters for the list searching
    expect(epilogue.sequelize.STRING).to.exist;
    expect(epilogue.sequelize.TEXT).to.exist;
    expect(epilogue.sequelize.and).to.exist;
    expect(epilogue.sequelize.or).to.exist;
  });
});
