'use strict';

var Endpoint = function(endpoint) {
	this.string = endpoint;
	this.attributes = endpoint
		.split('/')
		.filter(function(c) { return ~c.indexOf(':'); })
		.map(function(c) { return c.substring(1); });
};

module.exports = Endpoint;
