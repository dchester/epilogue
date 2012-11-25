# Epilogue

Create flexible REST endpoints and controllers from Sequelize models in your Express app

## Getting Started

Create a Sequelize model:
```
var User = sequelize.define(...);
```

Create a resource with endpoints:

```
var rest = require('epilogue');
rest.initialize({ app: app });

var users = rest.resource({
    model: User,
    endpoints: ['/users', '/users/:id']
});
```

On the server we now have the following controllers:

|| Controller || Endpoint || Description ||
| users.create | POST /user | Create a user |
| users.list | GET /users  | Get a listing of users |
| users.read | GET /users/:id | Get details about a user |
| users.update | POST /users/:id | Update a user|
| users.delete | DELETE /users/:id | Delete a user |


Our `users` resource has properties for each of the controller actions.  Controller actions in turn have hooks for setting and overriding behavior at each step of the request.  We have these milestones to work with: `start`, `auth`, `fetch`, `data`, `write`, `send`, and `complete`.

```
// disallow deletes on users
users.delete.auth(function(req, res, context) {
	res.json(403, { error: "can't delete a user" });
	context.stop();
})
```

By default, `fetch`, `write`, and `send` milestones are defined, with the others left open.  We can set behavior for milestones directly as above, or we can add functionality before and after milestones too.

```
// check the cache first
users.list.fetch.before(function(req, res, context) {
	context.instance = cache.get(context.criteria);
	context.continue();
})
```

## Epilogue Documentation

##### initialize()

Set defaults and give epilouge a reference to your express app.  Send the following parameters

###### app

A reference to the Express application

##### resource()

Create a resource and CRUD actions given a Sequelize model and endpoints.  Accepts these parameters:

###### model

Reference to a Sequelize model

###### endpoints

Create a resource, given a Sequelize model and endpoints.  Specify endpoints as an array with two sinatra-style URL paths in plural and singular form (e.g., `['/users', '/users/:id']`).

##### actions

Create only the specified list of actions for the resource.  Options include `create`, `list`, `read`, `update`, and `delete`.  Defaults to all.

### Milestones

Milestones provide opportunities to run custom application code at various important steps throughout the duration of the request.

Resources have properties for each controller action: `create`, `list`, `read`, `update`, and `delete`.  Also find a meta property `all` as a convenience for hooking into milestones across all controllers.  Each of those properties in turn has methods for setting custom behavior.

For each milestone on a given controller we accept a function specifying custom behavior:

##### authorize(f)

Authorize the request according to the function passed in.  Request continues normally if the function returns true, or otherwise returns a 403.

##### validate(f)

Validate the request according to the function passed in.  Request continues normally if the function returns true, or otherwise returns a 400.

##### data(f)

Transform or translate the data before it's written or returned back in the response.

##### complete(f)

Run the specified function when the request is complete, regardless of w

##### error(f)

Run the specified function when the request is complete

#### Milestones & Context

Milestone methods take functions which can expect as paramaters a request, a response, a resource, and a context. Context objects contain key properties about the state of the resource at the given request milestone, as well as methods give back control.

###### instance

Instance of a dataset fetched via the supplied model.  May be undefined for early milestones prior to the fetching of the data.

###### attributes

Attribues supplied by the request, usually in anticipation of creating or updating an instance.

###### criteria

Criteria for fetching, usually supplied by request parameters.

###### continue()

Continue with the request, on through the rest of the milestones.

###### stop()

Indicate that this should be the last milestone to be processed.

