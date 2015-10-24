'use strict';

var Promise = require('bluebird'),
    request = require('request'),
    expect = require('chai').expect,
    _ = require('lodash'),
    rest = require('../../lib'),
    test = require('../support');

describe('Associations(BelongsTo)', function() {
  before(function() {
    test.models.User = test.db.define('users', {
      id: { type: test.Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      username: { type: test.Sequelize.STRING, unique: true },
      email: { type: test.Sequelize.STRING, unique: true, validate: { isEmail: true } }
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.Yuppie = test.db.define('yuppies', {
      id: { type: test.Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      username: { type: test.Sequelize.STRING, unique: true },
      email: { type: test.Sequelize.STRING, unique: true, validate: { isEmail: true } }
    }, {
      underscored: true,
      timestamps: false
    });

    test.models.Address = test.db.define('addresses', {
      id: { type: test.Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      street: { type: test.Sequelize.STRING },
      state_province: { type: test.Sequelize.STRING },
      postal_code: { type: test.Sequelize.STRING },
      country_code: { type: test.Sequelize.STRING }
    }, {
      underscored: true,
      timestamps: false
    });

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

    // Yuppies have two addresses
    test.models.Yuppie.belongsTo(test.models.Address, {
      as: 'address2',
      foreignKey: 'address2_id'
    });
    test.models.Yuppie.belongsTo(test.models.Address);

    test.models.User.belongsTo(test.models.Address);  // user has an address_id
    test.models.Person.belongsTo(test.models.Address, {
      as: 'addy',
      foreignKey: 'addy_id'
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

  beforeEach(function() {
    return Promise.all([ test.initializeDatabase(), test.initializeServer() ])
      .then(function() {
        rest.initialize({
          app: test.app,
          sequelize: test.Sequelize
        });

        test.usersResource = rest.resource({
          model: test.models.User,
          endpoints: ['/users', '/users/:id'],
          associations: true
        });

        rest.resource({
          model: test.models.User,
          endpoints: ['/usersWithoutFK', '/usersWithoutFK/:id'],
          associations: {
            removeForeignKeys: true
          }
        });

        rest.resource({
          model: test.models.User,
          endpoints: ['/usersWithoutInclude', '/usersWithoutInclude/:id']
        });

        rest.resource({
          model: test.models.Person,
          endpoints: ['/people', '/people/:id'],
          associations: true
        });

        rest.resource({
          model: test.models.Yuppie,
          endpoints: ['/yuppies', '/yuppies/:id'],
          associations: true
        });

        rest.resource({
          model: test.models.Person,
          include: [
            { model: test.models.Address, as: 'addy' },
            { model: test.models.Hobby, as: 'hobbies' }
          ],
          endpoints: ['/personWithTwoIncludes', '/personWithTwoIncludes/:id']
        });

        rest.resource({
          model: test.models.Address,
          endpoints: ['/addresses', '/addresses/:id']
        });
      });
  });

  afterEach(function() {
    return test.clearDatabase()
      .then(function() { return test.closeServer(); });
  });

  // TESTS
  describe('read', function() {
    beforeEach(function() {
      return Promise.all([
        test.models.Address.create({
          street: '221B Baker Street',
          state_province: 'London',
          postal_code: 'NW1',
          country_code: '44'
        }),
        test.models.Address.create({
          street: 'Avenue de l\'Atomium',
          state_province: 'Brussels',
          postal_code: '1020',
          country_code: '32'
        }),
        test.models.User.create({
          username: 'sherlock',
          email: 'sherlock@holmes.com'
        }),
        test.models.User.create({
          username: 'MannekenPis',
          email: 'manneken.pis@brussels.be'
        }),
        test.models.Person.create({ name: 'barney' })
      ]).spread(function(address, address2, user, user2, person) {
        return Promise.all([
          user.setAddress(address),
          person.setAddy(address)
        ]);
      });
    });

    it('should include prefetched data', function(done) {
      request.get({
        url: test.baseUrl + '/users/1'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        var expected = {
          id: 1,
          username: 'sherlock',
          email: 'sherlock@holmes.com',
          address_id: 1,
          address: {
            id: 1,
            street: '221B Baker Street',
            state_province: 'London',
            postal_code: 'NW1',
            country_code: '44'
          }
        };

        expect(result).to.eql(expected);
        done();
      });
    });

    it('should include prefetched data without foreign keys', function(done) {
      test.usersResource.associationOptions.removeForeignKeys = true;
      request.get({
        url: test.baseUrl + '/users/1'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        var expected = {
          id: 1,
          username: 'sherlock',
          email: 'sherlock@holmes.com',
          address: {
            id: 1,
            street: '221B Baker Street',
            state_province: 'London',
            postal_code: 'NW1',
            country_code: '44'
          }
        };

        expect(result).to.eql(expected);
        test.usersResource.associationOptions.removeForeignKeys = false;
        done();
      });
    });

    it('should include prefetched data for an aliased relation', function(done) {
      request.get({
        url: test.baseUrl + '/people/1'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        var expected = {
          id: 1,
          name: 'barney',
          hobbies: [],
          addy_id: 1,
          addy: {
            id: 1,
            street: '221B Baker Street',
            state_province: 'London',
            postal_code: 'NW1',
            country_code: '44'
          }
        };

        expect(result).to.eql(expected);
        done();
      });
    });

    it('should return associated data by url', function(done) {
      request.get({
        url: test.baseUrl + '/users/1/address'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        var expected = {
          id: 1,
          street: '221B Baker Street',
          state_province: 'London',
          postal_code: 'NW1',
          country_code: '44'
        };

        expect(result).to.eql(expected);
        done();
      });
    });

    it('should return associated data by url (2)', function(done) {
      request.get({
        url: test.baseUrl + '/users/2/address'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        var expected = {
          id: 2,
          street: 'Avenue de l\'Atomium',
          state_province: 'Brussels',
          postal_code: '1020',
          country_code: '32'
        };

        expect(result).to.eql(expected);
        done();
      });
    });

    it('should include prefetched data without foreign key', function(done) {
      request.get({
        url: test.baseUrl + '/usersWithoutFK/1'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        var expected = {
          id: 1,
          username: 'sherlock',
          email: 'sherlock@holmes.com',
          address: {
            id: 1,
            street: '221B Baker Street',
            state_province: 'London',
            postal_code: 'NW1',
            country_code: '44'
          }
        };

        expect(result).to.eql(expected);
        done();
      });
    });

  });

  describe('list', function() {
    beforeEach(function() {
      test.expectedResults = [];
      var testData = [
        {
          user: { username: 'sherlock', email: 'sherlock@gmail.com' },
          address: { street: '221B Baker Street', state_province: 'London, UK', postal_code: 'NW1', country_code: '44'}
        },
        {
          user: { username: 'barack', email: 'barack@gmail.com' },
          address: { street: '1600 Pennsylvania Ave', state_province: 'Washington, DC', postal_code: '20500', country_code: '001'}
        },
        {
          user: { username: 'tony', email: 'tony@gmail.com' },
          address: { street: '633 Stag Trail RD', state_province: 'Caldwell, NJ', postal_code: '07006', country_code: '001'}
        },
        {
          user: { username: 'eddie', email: 'eddie@gmail.com' },
          address: { street: '1313 Mockingbird Ln', state_province: 'Lincoln, CA', postal_code: '95648', country_code: '001'}
        },
        {
          user: { username: 'lucy', email: 'lucy@gmail.com' },
          address: { street: '623 East 68th Street', state_province: 'New York, NY', postal_code: '10065', country_code: '001'}
        }
      ];

      return Promise.resolve(testData).each(function(entry) {
        return Promise.all([
          test.models.User.create(entry.user),
          test.models.Address.create(entry.address)
        ]).spread(function(user, address) {
          var expectedResult = entry.user;
          expectedResult.id = user.id;
          expectedResult.address = address.dataValues;
          expectedResult.address_id = address.dataValues.id;
          test.expectedResults.push(expectedResult);

          return user.setAddress(address);
        });
      });
    });

    afterEach(function() {
      delete test.expectedResults;
    });

    it('should include prefetched data', function(done) {
      request.get({
        url: test.baseUrl + '/users'
      }, function(error, response, body) {
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql(test.expectedResults);
        done();
      });
    });

    it('should pass query parameters to search', function(done) {
      request.get({
        url: test.baseUrl + '/usersWithoutInclude?address_id=1'
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result.length).to.equal(1);

        var actual = result[0];
        var expected = {
          id: 1,
          username: 'sherlock',
          email: 'sherlock@gmail.com',
          address_id: 1
        };

        expect(actual).to.eql(expected);
        done();
      });
    });

    it('should include two associations', function(done) {
      var hobbyRecords = [
        { name: 'programming' },
        { name: 'baseball' }
      ];
      var records = [
        {
          person: { name: 'john' },
          address: { street: '100 First Street ' }
        },
        {
          person: { name: 'joe' },
          address: { street: '200 Second Street' }
        }
      ];
      var expectedPerson;
      var expectedId;
      Promise.resolve(records).each(function(record) {
        return Promise.all([
          test.models.Person.create(record.person),
          test.models.Address.create(record.address)
        ]).spread(function(person, address) {
          return person.setAddy(address);
        });
      }).then(function() {
        return Promise.all([
          test.models.Hobby.create(hobbyRecords[0]),
          test.models.Hobby.create(hobbyRecords[1]),
          test.models.Person.findAll()
        ]);
      }).spread(function(hobby0, hobby1, people) {
        var person = people[0];
        expectedId = person.id;
        return person.setHobbies([hobby0, hobby1]);
      }).then(function(hobbies) {
        return test.models.Person.find({
          where: { id: expectedId },
          include: [
            { model: test.models.Address, as: 'addy' },
            { model: test.models.Hobby, as: 'hobbies' }
          ]
        });
      }).then(function(person) {
        expectedPerson = JSON.parse(JSON.stringify(person.dataValues));
        request.get({
          url: test.baseUrl + '/personWithTwoIncludes?q=' + expectedPerson.name
        }, function(error, response, body) {
          expect(response.statusCode).to.equal(200);
          body = _.isObject(body) ? body : JSON.parse(body);
          expect(body[0]).to.eql(expectedPerson);
          done();
        });
      });
    });

    it('should include prefetched data without foreign key', function(done) {
      request.get({
        url: test.baseUrl + '/usersWithoutFK'
      }, function(error, response, body) {
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result).to.eql(test.expectedResults.map(function(i) {
          delete i.address_id;
          return i;
        }));
        done();
      });
    });

  });

  describe('update', function() {
    beforeEach(function() {
      test.addresses = [
        {
          street: '221B Baker Street',
          state_province: 'London',
          postal_code: 'NW1',
          country_code: '44'
        },
        {
          street: 'Avenue de l\'Atomium',
          state_province: 'Brussels',
          postal_code: '1020',
          country_code: '32'
        }
      ];

      return Promise.all([
        test.models.Address.create(test.addresses[0]),
        test.models.Address.create(test.addresses[1]),
        test.models.User.create({
          username: 'sherlock',
          email: 'sherlock@holmes.com'
        }),
        test.models.User.create({
          username: 'watson',
          email: 'watson@holmes.com'
        }),
        test.models.Yuppie.create({
          username: 'richguy',
          email: 'lotsof@money.com'
        })
      ]).spread(function(address, address2, user, user2, yuppie) {
        test.addresses[0].id = address.id;
        test.addresses[1].id = address2.id;
        return Promise.all([
          user.setAddress(address),
          yuppie.setAddress(address)
        ]);
      });
    });

    it('should include associated data', function(done) {
      request.put({
        url: test.baseUrl + '/users/1',
        json: {}
      }, function(error, response, body) {
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result.address).to.be.an('object');
        expect(result.address.id).to.be.eql(1);
        done();
      });
    });

    it('should not include associated data', function(done) {
      request.put({
        url: test.baseUrl + '/usersWithoutInclude/1',
        json: {}
      }, function(error, response, body) {
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result.address_id).to.exist;
        expect(result.address_id).to.be.eql(1);
        done();
      });
    });

    it('should include the new associated data with multiple references to the same model', function(done) {
      request.put({
        url: test.baseUrl + '/yuppies/1',
        json: {
          address_id: 2
        }
      }, function(error, response, body) {
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result.address).to.be.an('object');
        expect(result.address_id).to.be.eql(2);
        expect(result.address).to.eql(test.addresses[1]);
        done();
      });
    });

    it('should include the new associated data', function(done) {
      request.put({
        url: test.baseUrl + '/users/1',
        json: {
          address_id: 2
        }
      }, function(error, response, body) {
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result.address).to.be.an('object');
        expect(result.address.id).to.be.eql(2);
        expect(result.address).to.eql(test.addresses[1]);
        done();
      });
    });

    it('should include the new associated data by identifier of object nested', function(done) {
      request.put({
        url: test.baseUrl + '/users/1',
        json: {
          address: { id: 2 }
        }
      }, function(error, response, body) {
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result.address).to.be.an('object');
        expect(result.address.id).to.be.eql(2);
        expect(result.address_id).to.be.eql(2);
        done();
      });
    });

    it('should include the new associated data without foreign key', function(done) {
      request.put({
        url: test.baseUrl + '/usersWithoutFK/1',
        json: {
          address_id: 2
        }
      }, function(error, response, body) {
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result.address).to.be.an('object');
        expect(result.address.id).to.be.eql(2);
        expect(result).to.not.contain.key('address_id');
        done();
      });
    });

    it('should allow updating an association to null by replacing its primary key', function(done) {
      request.put({
        url: test.baseUrl + '/users/1',
        json: {
          address: { id: 2 }
        }
      }, function(error, response, body) {
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result.address).to.be.an('object');
        expect(result.address.id).to.be.eql(2);

        request.put({
          url: test.baseUrl + '/users/1',
          json: {
            address: { id: null }
          }
        }, function(error, response, body) {
          var result = _.isObject(body) ? body : JSON.parse(body);
          expect(result.address).to.be.null;

          done();
        });
      });
    });

    it('should allow updating an association with null', function(done) {
      request.put({
        url: test.baseUrl + '/users/1',
        json: {
          address: { id: 2 }
        }
      }, function(error, response, body) {
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result.address).to.be.an('object');
        expect(result.address.id).to.be.eql(2);

        request.put({
          url: test.baseUrl + '/users/1',
          json: {
            address: null
          }
        }, function(error, response, body) {
          var result = _.isObject(body) ? body : JSON.parse(body);
          expect(result.address).to.be.null;

          done();
        });
      });
    });

    it('should successfully reload an instance with both 1:1 and m:n relation when the 1:1 relation is changed', function(done) {
      var personData = { name: 'John Smith' };
      Promise.all([
        test.models.Person.create(personData),
        test.models.Address.create({ street: '123 Main St' })
      ]).spread(function(person, address) {
        personData.addy_id = address.id;
        request.put({
          url: test.baseUrl + '/personWithTwoIncludes/' + person.id,
          json: personData
        }, function(error, response, body) {
          expect(response.statusCode).to.equal(200);
          done();
        });
      });
    });
  });

  describe('create', function() {
    beforeEach(function() {
      rest.resource({
        model: test.models.User,
        include: [test.models.Address],
        endpoints: ['/usersNotReloadInstances', '/usersNotReloadInstances/:id'],
        reloadInstances: false
      });

      return Promise.all([
        test.models.Address.create({
          street: '221B Baker Street',
          state_province: 'London',
          postal_code: 'NW1',
          country_code: '44'
        }),
        test.models.Address.create({
          street: 'Avenue de l\'Atomium',
          state_province: 'Brussels',
          postal_code: '1020',
          country_code: '32'
        })
      ]);
    });

    it('should include the new associated data by identifier of object nested', function(done) {
      request.post({
        url: test.baseUrl + '/users',
        json: {
          username: 'sherlock',
          address: { id: 2 }
        }
      }, function(error, response, body) {
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result.username).to.be.eql('sherlock');
        expect(result.address_id).to.be.eql(2);
        expect(result.address).to.be.an('object');
        expect(result.address.id).to.be.eql(2);
        done();
      });
    });

    it('should include the new associated data by identifier of object nested without reload', function(done) {
      request.post({
        url: test.baseUrl + '/usersNotReloadInstances',
        json: {
          username: 'sherlock',
          address: { id: 2 }
        }
      }, function(error, response, body) {
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result.username).to.be.eql('sherlock');
        expect(result).to.not.contain.key('address');
        expect(result.address_id).to.be.eql(2);
        done();
      });
    });

    it('should not include the associated data by identifier of object nested', function(done) {
      request.post({
        url: test.baseUrl + '/usersWithoutInclude',
        json: {
          username: 'sherlock'
        }
      }, function(error, response, body) {
        var result = _.isObject(body) ? body : JSON.parse(body);
        expect(result.username).to.be.eql('sherlock');
        expect(result).to.not.contain.key('address');
        done();
      });
    });

  });

});
