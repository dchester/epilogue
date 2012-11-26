var Sequelize = require('sequelize');
var sequelize = require('./db');

module.exports = sequelize.define('users', { 
	id:       { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true }, 
	username: { type: Sequelize.STRING, unique: true }, 
	email:    { type: Sequelize.STRING, unique: true, validate: { isEmail: true } } 
}, {
	underscored: true,
	timestamps: false
});

