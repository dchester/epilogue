'use strict';

module.exports = function(Resource, resource, association) {
  // access points
  var subResourceName =
    association.target.options.name.singular.toLowerCase();

  var associatedResource = new Resource({
    app: resource.app,
    sequelize: resource.sequelize,
    model: association.target,
    endpoints: [resource.endpoints.singular + '/' + subResourceName],
    actions: ['read']
  });

  // @todo: this could be improved...
  associatedResource.associationOptions = resource.associationOptions;
  associatedResource.controllers.read.includeAttributes = [ association.identifierField ];

  associatedResource.read.send.before(function(req, res, context) {
    if (this.resource.associationOptions.removeForeignKeys)
      delete context.instance.dataValues[association.identifierField];

    context.continue();
  });

  return associatedResource;
};
