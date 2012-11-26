var Sequelize = require('sequelize');

var sequelize = new Sequelize('main', null, null, {
	storage: "/tmp/epilogue-test.sqlite",
	dialect: 'sqlite',
	logging: false
});

module.exports = sequelize;

