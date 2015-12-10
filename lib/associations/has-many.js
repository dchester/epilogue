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
      resource.endpoints.plural + '/:' + association.identifierField + '/' + subResourceName + '/:' + association.target.primaryKeyField
    ],
    actions: ['read', 'list']
  });

  // @todo: this could be improved
  associatedResource.associationOptions = resource.associationOptions;
  associatedResource.controllers.read.includeAttributes = [ association.identifierField ];
  associatedResource.controllers.list.includeAttributes = [ association.identifierField ];

  associatedResource.list.fetch.before(function(req, res, context) {
    // Filter
    context.criteria = context.criteria || {};
    context.criteria[association.identifierField] = req.params[association.identifierField];
    context.continue();
  });

  return associatedResource;
};
