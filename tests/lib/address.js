var Sequelize = require('sequelize');
var sequelize = require('./db');

module.exports = sequelize.define('addresses', { 
	id:             { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true }, 
	street:         { type: Sequelize.STRING },
	state_province: { type: Sequelize.STRING },
	postal_code:    { type: Sequelize.STRING },
	country_code:   { type: Sequelize.STRING }
}, {
	underscored: true,
	timestamps: false
});

