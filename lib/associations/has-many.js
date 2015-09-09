'use strict';

module.exports = function(Resource, resource, association) {
  // access points
  var subResourceName =
    association.target.options.name.plural.toLowerCase();

  var associatedResource = new Resource({
    app: resource.app,
    sequelize: resource.sequelize,
    model: association.target,
    endpoints: [
      resource.endpoints.plural + '/:' + association.identifierField + '/' + subResourceName,
      resource.endpoints.plural + '/:' + association.identifierField + '/' + subResourceName + '/:id'
    ],
    actions: ['read', 'list']
  });

  associatedResource.read.send.before(function(req, res, context) {
    delete context.instance.dataValues[association.identifierField];
    context.continue();
  });

  associatedResource.list.fetch.before(function(req, res, context) {
    // Filter
    context.criteria = context.criteria || {};
    context.criteria[association.identifierField] = req.params[association.identifierField];
    context.continue();
  });

  associatedResource.list.send.before(function(req, res, context) {
    context.instance.forEach(function(instance) {
      delete instance.dataValues[association.identifierField];
    });

    context.continue();
  });

  return associatedResource;
};
