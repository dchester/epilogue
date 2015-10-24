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

    test.models.Thing = test.db.define('thing', {
      name: { type: test.Sequelize.STRING }
    });

    test.models.Person.belongsToMany(test.models.Hobby, {
      as: 'hobbies',
      through: 'person_hobbies',
      timestamps: false
    });
    test.models.Hobby.belongsToMany(test.models.Person, {
      as: 'people',
      through: 'person_hobbies',
      timestamps: false
    });
    test.models.Thing.belongsToMany(test.models.Person, {
      as: 'people',
      through: 'person_thing'
    });
  });

  beforeEach(function() {
    return Promise.all([ test.initializeDatabase(), test.initializeServer() ])
      .then(function() {
        rest.initialize({
          app: test.app,
          sequelize: test.Sequelize
        });

        rest.resource({
          model: test.models.Person,
          endpoints: ['/people', '/people/:id'],
          associations: true
        });

        rest.resource({
          model: test.models.Hobby,
          associations: true
        });

        rest.resource({
          model: test.models.Thing,
          associations: true
        });
      });
  });

  beforeEach(function() {
    return Promise.all([
      test.models.Person.create({ name: 'Mr 1' }),
      test.models.Person.create({ name: 'Mr 2' }),
      test.models.Hobby.create({ name: 'Azerty' }),
      test.models.Hobby.create({ name: 'Querty' }),
      test.models.Thing.create({ name: 'Abc' })
    ])
    .spread(function(p1, p2, h1, h2, t1) {
      return Promise.all([
        p1.setHobbies([h1,h2]),
        p2.setHobbies([h2]),
        t1.setPeople([p1])
      ]);
    });
  });

  afterEach(function() {
    return test.clearDatabase()
      .then(function() { return test.closeServer(); });
  });

  // TESTS
  describe('list', function() {

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

    it('should return associated data by url (3)', function(done) {
      request.get({
        url: test.baseUrl + '/hobbies/1/people'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql([{
          "id": 1,
          "name": "Mr 1",
          "hobbies": [{
              "id": 1,
              "name": "Azerty"
            }]
        }]);

        done();
      });
    });

    it('should return associated data by url (4)', function(done) {
      request.get({
        url: test.baseUrl + '/hobbies/2/people'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql([{
          "id": 1,
          "name": "Mr 1",
          "hobbies": [{
            "id": 2,
            "name": "Querty"
          }]
        },{
          "id": 2,
          "name": "Mr 2",
          "hobbies": [{
            "id": 2,
            "name": "Querty"
          }]
        }]);

        done();
      });
    });

    it('should return associated data by url (5)', function(done) {
      request.get({
        url: test.baseUrl + '/things/1'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.be.an('object');
        expect(result.id).to.be.eql(1);
        expect(result.people).to.be.an('array');
        expect(result.people.length).to.be.eql(1);
        done();
      });
    });

    it('should return 404 for non existent reverse lookup', function(done) {
      request.get({
        url: test.baseUrl + '/things/1/people'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(404);
        done();
      });
    });

    it('should return 404 for non existent reverse lookup', function(done) {
      request.get({
        url: test.baseUrl + '/people/1/things'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(404);
        done();
      });
    });

  });

  describe('read', function() {

    it('should return associated data by url', function(done) {
      request.get({
        url: test.baseUrl + '/people/1/hobbies/2'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql({
          "id": 2,
          "name": "Querty"
        });

        done();
      });
    });

    it('should return 404', function(done) {
      request.get({
        url: test.baseUrl + '/people/1/hobbies/3'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(404);
        done();
      });
    });

  });

});
