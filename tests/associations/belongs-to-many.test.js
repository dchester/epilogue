'use strict';

var Promise = require('bluebird'),
    request = require('request'),
    expect = require('chai').expect,
    _ = require('lodash'),
    rest = require('../../lib'),
    test = require('../support');

describe('Associations(BelongsToMany)', function() {
  before(function() {
    test.models.Person = test.db.define('person', {
      id: { type: test.Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: test.Sequelize.STRING, unique: true }
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.Hobby = test.db.define('hobby', {
      id: { type: test.Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: test.Sequelize.STRING }
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.Person.belongsToMany(test.models.Hobby, {
      as: 'hobbies',
      through: 'person_hobbies'
    });
    test.models.Hobby.belongsToMany(test.models.Person, {
      as: 'people',
      through: 'person_hobbies'
    });
  });

  beforeEach(function(done) {
    test.initializeDatabase(function() {
      test.initializeServer(function() {
        rest.initialize({
          app: test.app,
          sequelize: test.Sequelize
        });

        rest.resource({
          model: test.models.Person,
          endpoints: ['/people', '/people/:id'],
          associations: true
        });

        done();
      });
    });
  });

  afterEach(function(done) {
    test.clearDatabase(function() {
      test.server.close(done);
    });
  });

  // TESTS
  describe('list', function() {
    beforeEach(function() {
      return Promise.all([
        test.models.Person.create({
          name: 'Mr 1'
        }),
        test.models.Person.create({
          name: 'Mr 2'
        }),
        test.models.Hobby.create({
          name: 'Azerty'
        }),
        test.models.Hobby.create({
          name: 'Querty'
        })
      ]).spread(function(p1, p2, h1, h2) {
        return p1.setHobbies([h1,h2]).then(function() {
          return p2.setHobbies([h2]);
        });
      });
    });

    it('should return one record with associated objects', function(done) {
      request.get({
        url: test.baseUrl + '/people/1'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql({
          id: 1, name: 'Mr 1',
          'hobbies': [{
            "id": 1,
            "name": "Azerty",
            "person_hobbies": {
              "hobby_id": 1,
              "person_id": 1
            }
          },{
            "id": 2,
            "name": "Querty",
            "person_hobbies": {
              "hobby_id": 2,
              "person_id": 1
            }
          }]
        });

        done();
      });
    });

    it('should return associated data by url', function(done) {
      request.get({
        url: test.baseUrl + '/people/1/hobbies'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql([{
          "id": 1,
          "name": "Azerty",
          "people": [{
            "id": 1,
            "name": "Mr 1"
          }]
        },{
          "id": 2,
          "name": "Querty",
          "people": [{
            "id": 1,
            "name": "Mr 1"
          }]
        }]);

        done();
      });
    });

    it('should return associated data by url (2)', function(done) {
      request.get({
        url: test.baseUrl + '/people/2/hobbies'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql([{
          "id": 2,
          "name": "Querty",
          "people": [{
            "id": 2,
            "name": "Mr 2"
          }]
        }]);

        done();
      });
    });

  });

});
