[![Build Status](https://travis-ci.org/dchester/epilogue.png?branch=master)](https://travis-ci.org/dchester/epilogue)

# Epilogue

Create flexible REST endpoints and controllers from [Sequelize](http://www.sequelizejs.com/) models in your [Express](http://expressjs.com/) app in Node.

### Start with a model

Define your models with [Sequelize](http://www.sequelizejs.com/) on top of MySQL, Postgres, or SQLite.  Describe tables and columns and their attributes, model entity relationships, etc.

```javascript
var User = sequelize.define(...);
```

### Create a resource

Load up `epilogue` and provide a reference to your Express app.  Then create resources, specifying a model and endpoints.

```javascript
var rest = require('epilogue');

rest.initialize({
    app: app,
    sequelize: sequelize
});

var users = rest.resource({
    model: User,
    endpoints: ['/users', '/users/:id']
});
```

### Controllers and endpoints

On the server we now have the following controllers and endpoints:

Controller | Endpoint | Description
-----------|----------|------------
users.create | POST /users | Create a user
users.list | GET /users  | Get a listing of users
users.read | GET /users/:id | Get details about a user
users.update | PUT /users/:id | Update a user
users.delete | DELETE /users/:id | Delete a user

### Customize behavior

Of course it's likely that we'll want more flexibility.  Our `users` resource has properties for each of the controller actions.  Controller actions in turn have hooks for setting and overriding behavior at each step of the request.  We have these milestones to work with: `start`, `auth`, `fetch`, `data`, `write`, `send`, and `complete`.

```javascript
// disallow deletes on users
users.delete.auth(function(req, res, context) {
	res.json(403, { error: "can't delete a user" });
	context.stop();
})
```

By default, `fetch`, `write`, and `send` milestones are defined, with the others left open.  We can set behavior for milestones directly as above, or we can add functionality before and after milestones too:

```javascript
// check the cache first
users.list.fetch.before(function(req, res, context) {

	var instance = cache.get(context.criteria);

	if (instance) {
		// keep a reference to the instance and skip the fetch
		context.instance = instance;
		context.skip();
	} else {
		// cache miss; we continue on
		context.continue();
	}
})
```

Milestones can also be defined in a declarative fashion, and used as middleware with any resource. For example:

```javascript
// my-middleware.js
module.exports = {
  create: {
    fetch: function(req, res, context) {
      // manipulate the fetch call
      context.continue();
    }
  },
  list: {
    write: {
      before: function(req, res, context) {
        // modify data before writing list data
        context.continue();
      },
      action: function(req, res, context) {
        // change behavior of actually writing the data
        context.continue();
      },
      after: function(req, res, context) {
        // set some sort of flag after writing list data
        context.continue();
      }
    }
  }
};

// my-app.js
var rest = require('epilogue'),
    restMiddleware = require('my-middleware');

rest.initialize({
    app: app,
    sequelize: sequelize
});

var users = rest.resource({
    model: User,
    endpoints: ['/users', '/users/:id']
});

users.use(restMiddleware);
```

Epilogue middleware also supports bundling in extra resource configuration by specifying
an "extraConfiguration" member of the middleware like so:

```
// my-middleware.js
module.exports = {
  extraConfiguration: function(resource) {
    // support delete for plural form of a resource
    var app = resource.app;
    app.del(resource.endpoints.plural, function(req, res) {
      resource.controllers.delete._control(req, res);
    });
  }
};
```

### Pagination

List routes support pagination via `offset` or `page` and `count` query parameters.  Find metadata about pagination and number of results in the `Content-Range` response header.

```bash
# get the third page of results
$ curl http://localhost/users?offset=200&count=100
HTTP/1.1 200 OK
Content-Type: application/json
Content-Range: items 200-299/3230

[
  { name: "James Conrad" },
  ...
]
```

## Epilogue API

#### initialize()

Set defaults and give epilouge a reference to your express app.  Send the following parameters:

> ###### app
>
> A reference to the Express application
>
> ###### base
>
> Prefix to prepend to resource endpoints
>
> ###### updateMethod
>
> HTTP method to use for update routes, one of `POST`, `PUT`, or `PATCH`

#### resource()

Create a resource and CRUD actions given a Sequelize model and endpoints.  Accepts these parameters:

> ###### model
>
> Reference to a Sequelize model
>
> ###### endpoints
>
> Specify endpoints as an array with two sinatra-style URL paths in plural and singular form (e.g., `['/users', '/users/:id']`).
>
> ###### actions
>
> Create only the specified list of actions for the resource.  Options include `create`, `list`, `read`, `update`, and `delete`.  Defaults to all.

### Milestones

Milestones provide opportunities to run custom application code at various important steps throughout the duration of the request.

Resources have properties for each controller action: `create`, `list`, `read`, `update`, and `delete`.  Also find a meta property `all` as a convenience for hooking into milestones across all controllers.  Each of those properties in turn has methods for setting custom behavior.

For each milestone on a given controller we accept a function to specify custom behavior.  Functions can expect three parameters: a request, a response, and a context object.

#### start(f)

Run at the beginning of the request.  Defaults to passthrough.

#### auth(f)

Authorize the request.  Defaults to passthrough.

#### fetch(f)

Fetch data from the database for non-create actions according to `context.criteria`, writing to `context.instance`.

#### data(f)

Transform the data from the database if needed.  Defaults to passthrough.

#### write(f)

Write to the database for actions that write, reading from `context.attributes`.

#### send(f)

Send the HTTP response, headers along with the data in `context.instance`.

#### complete(f)

Run the specified function when the request is complete, regardless of the status of the response.

### Milestones & Context

Milestone methods take functions which can expect as paramaters a request, a response, and a context. Context objects contain key properties about the state of the resource at the given request milestone, as well as methods to give back control.

##### context.instance

Instance of a dataset fetched via the supplied model.  May be undefined for early milestones prior to the fetching of the data.

##### context.attributes

Attribues supplied by the request, usually in anticipation of creating or updating an instance.

##### context.criteria

Criteria for fetching, usually supplied by request parameters.

##### context.continue()

Continue with the request, on through the rest of the milestones.

##### context.stop()

Indicate that this should be the last milestone to be processed.

##### context.skip()

Skip to the next milestone, usually called from `before`.

## License

Copyright (C) 2012-2014 David Chester

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
