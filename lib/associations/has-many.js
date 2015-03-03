'use strict';

module.exports = function(Resource, resource, association) {
  // access points
  var subResourceName =
    association.target.options.name.plural.toLowerCase();

  var associatedResource = new Resource({
    app: resource.app,
    model: association.target,
    endpoints: [
      resource.endpoints.plural + '/:' + association.identifierField + '/' + subResourceName,
      resource.endpoints.plural + '/:unused/' + subResourceName + '/:id'
    ],
    actions: ['read', 'list']
  });

  associatedResource.read.send.before(function(req, res, context) {
    delete context.instance.dataValues[association.identifierField];
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
