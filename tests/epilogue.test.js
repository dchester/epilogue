'use strict';

var epilogue = require('../lib'),
    expect = require('chai').expect;

describe('Epilogue', function() {

  it('should throw an exception when initialized without arguments', function(done) {
    expect(epilogue.initialize).to.throw('please specify an app');
    done();
  });

  it('should throw an exception with an invalid updateMethod', function(done) {
    expect(epilogue.initialize.bind(epilogue, {
      app: {},
      sequelize: {},
      updateMethod: 'dogs'
    })).to.throw('updateMethod must be one of PUT, POST, or PATCH');
    done();
  });

});
