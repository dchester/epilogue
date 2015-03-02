'use strict';

var TestMiddlewareBeforeAfter = {
  results: {},
  extraConfiguration: function(resource) {
    TestMiddlewareBeforeAfter.results.extraConfiguration = true;
  }
};

TestMiddlewareBeforeAfter.results.extraConfiguration = false;
var actions = ['create', 'list', 'read', 'update', 'delete', 'all'],
    milestones = ['start', 'auth', 'fetch', 'data', 'write', 'send', 'complete'];

actions.forEach(function(action) {
  TestMiddlewareBeforeAfter.results[action] = {};
  TestMiddlewareBeforeAfter[action] = {};
  milestones.forEach(function(milestone) {
    TestMiddlewareBeforeAfter.results[action][milestone] = {};
    TestMiddlewareBeforeAfter.results[action][milestone].action = false;
    TestMiddlewareBeforeAfter.results[action][milestone].before = false;
    TestMiddlewareBeforeAfter.results[action][milestone].after = false;

    TestMiddlewareBeforeAfter[action][milestone] = {
      before: function(req, res, context) {
        TestMiddlewareBeforeAfter.results[action][milestone].before = true;
        return context.continue;
      },
      action: function(req, res, context) {
        TestMiddlewareBeforeAfter.results[action][milestone].action = true;
        return context.continue;
      },
      after: function(req, res, context) {
        TestMiddlewareBeforeAfter.results[action][milestone].after = true;
        return context.continue;
      }
    };
  });
});

module.exports = TestMiddlewareBeforeAfter;
