'use strict';

var Promise = require('bluebird'),
    request = require('request'),
    expect = require('chai').expect,
    _ = require('lodash'),
    rest = require('../../lib'),
    test = require('../support');

describe('issue 107', function() {
  before(function() {
    test.models.Channel = test.db.define('Channel', { name: test.Sequelize.STRING }, { timestamps: false, });
    test.models.AdSlot = test.db.define('AdSlot', { name: test.Sequelize.STRING }, { timestamps: false, });
    test.models.Channel.hasMany(test.models.AdSlot, { onDelete: 'cascade', hooks: true });
    test.models.AdSlot.belongsTo(test.models.Channel);
  });

  beforeEach(function() {
    return Promise.all([ test.initializeDatabase(), test.initializeServer() ])
      .then(function() {
        rest.initialize({ app: test.app, sequelize: test.Sequelize });

        test.channelResource = rest.resource({
          model: test.models.Channel,
          associations: true,
          attributes: ['id','name'],
          endpoints: ['/api/channels', '/api/channels/:id']
        });

        return Promise.all([
            test.models.Channel.create({ name: 'testChannel' }),
            test.models.AdSlot.create({ name: 'testAd' })
          ])
          .spread(function(channel, ad) {
            return Promise.all([
              channel.setAdSlots([ ad ]), ad.setChannel(channel)
            ]);
          });
      });
  });

  afterEach(function() {
    return test.clearDatabase()
      .then(function() { return test.closeServer(); });
  });

  it('list should work', function(done) {
    request.get({
      url: test.baseUrl + '/api/channels'
    }, function(error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      expect(result).to.eql([ {
        id: 1, name: 'testChannel',
        AdSlots: [ { id: 1, name: 'testAd', ChannelId: 1  } ]
      } ]);

      done();
    });
  });

  it('list should work on associated data', function(done) {
    request.get({
      url: test.baseUrl + '/api/channels/1/adslots'
    }, function(error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      expect(result).to.eql([ { id: 1, name: 'testAd', ChannelId: 1 } ]);
      done();
    });
  });

  it('read should work', function(done) {
    request.get({
      url: test.baseUrl + '/api/channels/1'
    }, function(error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      expect(result).to.eql({
        id: 1, name: 'testChannel',
        AdSlots: [ { id: 1, name: 'testAd', ChannelId: 1  } ]
      });

      done();
    });
  });

  it('read should work on associated data', function(done) {
    request.get({
      url: test.baseUrl + '/api/channels/1/adslots/1'
    }, function(error, response, body) {
      expect(response.statusCode).to.equal(200);
      var result = _.isObject(body) ? body : JSON.parse(body);
      expect(result).to.eql({ id: 1, name: 'testAd', ChannelId: 1 });
      done();
    });
  });

});
