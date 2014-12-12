'use strict';

var TestMiddleware = {
  results: {}
};

var actions = ['create', 'list', 'read', 'update', 'delete'],
    milestones = ['start', 'auth', 'fetch', 'data', 'write', 'send', 'complete'];

actions.forEach(function(action) {
  TestMiddleware.results[action] = {};
  TestMiddleware[action] = {};
  milestones.forEach(function(milestone) {
    TestMiddleware.results[action][milestone] = false;
    TestMiddleware[action][milestone] = function(req, res, context) {
      TestMiddleware.results[action][milestone] = true;
      context.continue();
    };
  });
});

module.exports = TestMiddleware;
