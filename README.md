[![Build Status](https://travis-ci.org/dchester/epilogue.svg?branch=master)](https://travis-ci.org/dchester/epilogue) [![Dependency Status](https://david-dm.org/dchester/epilogue.svg)](https://david-dm.org/dchester/epilogue)

# Epilogue

Create flexible REST endpoints and controllers from [Sequelize](http://www.sequelizejs.com/) models in your [Express](http://expressjs.com/) or [Restify](https://github.com/restify/node-restify) app.

### Getting Started
```javascript
var Sequelize = require('sequelize'),
    epilogue = require('epilogue'),
    http = require('http');

// Define your models
var database = new Sequelize('database', 'root', 'password');
var User = database.define('User', {
  username: Sequelize.STRING,
  birthday: Sequelize.DATE
});

// Initialize server
var server, app;
if (process.env.USE_RESTIFY) {
  var restify = require('restify');

  app = server = restify.createServer()
  app.use(restify.queryParser());
  app.use(restify.bodyParser());
} else {
  var express = require('express'),
      bodyParser = require('body-parser');

  var app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  server = http.createServer(app);
}

// Initialize epilogue
epilogue.initialize({
  app: app,
  sequelize: database
});

// Create REST resource
var userResource = epilogue.resource({
  model: User,
  endpoints: ['/users', '/users/:id']
});

// Create database and listen
database
  .sync({ force: true })
  .then(function() {
    server.listen(function() {
      var host = server.address().address,
          port = server.address().port;

      console.log('listening at http://%s:%s', host, port);
    });
  });
```

### Controllers and endpoints

On the server we now have the following controllers and endpoints:

Controller | Endpoint | Description
-----------|----------|------------
userResource.create | POST /users | Create a user
userResource.list | GET /users  | Get a listing of users
userResource.read | GET /users/:id | Get details about a user
userResource.update | PUT /users/:id | Update a user
userResource.delete | DELETE /users/:id | Delete a user

### Customize behavior

Of course it's likely that we'll want more flexibility.
Our `users` resource has properties for each of the controller actions.
Controller actions in turn have hooks for setting and overriding behavior at each step of the request.
We have these milestones to work with: `start`, `auth`, `fetch`, `data`, `write`, `send`, and `complete`.

```javascript
var ForbiddenError = require('epilogue').Errors.ForbiddenError;

// disallow deletes on users
userResource.delete.auth(function(req, res, context) {
    throw new ForbiddenError("can't delete a user");
    // optionally:
    // return context.error(403, "can't delete a user");
})
```

We can set behavior for milestones directly as above, or we can add functionality before and after milestones too:

```javascript
// check the cache first
userResource.list.fetch.before(function(req, res, context) {
	var instance = cache.get(context.criteria);

	if (instance) {
		// keep a reference to the instance and skip the fetch
		context.instance = instance;
		return context.skip;
	} else {
		// cache miss; we continue on
		return context.continue;
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
      return context.continue;
    }
  },
  list: {
    write: {
      before: function(req, res, context) {
        // modify data before writing list data
        return context.continue;
      },
      action: function(req, res, context) {
        // change behavior of actually writing the data
        return context.continue;
      },
      after: function(req, res, context) {
        // set some sort of flag after writing list data
        return context.continue;
      }
    }
  }
};

// my-app.js
var epilogue = require('epilogue'),
    restMiddleware = require('my-middleware');

epilogue.initialize({
    app: app,
    sequelize: sequelize
});

var userResource = epilogue.resource({
    model: User,
    endpoints: ['/users', '/users/:id']
});

userResource.use(restMiddleware);
```

Epilogue middleware also supports bundling in extra resource configuration by specifying
an "extraConfiguration" member of the middleware like so:

```javascript
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

To show an error and halt execution of milestone functions you can throw an error:

```javascript
var ForbiddenError = require('epilogue').Errors.ForbiddenError;

before: function(req, res, context) {
    return authenticate.then(function(authed) {
        if(!authed) throw new ForbiddenError();

        return context.continue;
    });
}
```

## REST API

Listing resources support filtering, searching, sorting, and pagination as described below.

### Filtering

Add query parameters named after fields to limit results.

```bash
$ curl http://localhost/users?name=James+Conrad

HTTP/1.1 200 OK
Content-Type: application/json

[
  {
    "name": "James Conrad",
    "email": "jamesconrad@fastmail.fm"
  }
]
```

### Filtering using scope

Use `scope` to add additional filtering (More about scopes in sequelize - [http://docs.sequelizejs.com/en/latest/docs/scopes/](http://docs.sequelizejs.com/en/latest/docs/scopes/)).

```bash
  // Define scope in model
  ...
  scope: {
    verified: {
      where : {
        email_verified: true
        phone_verified: true
      }  
    }
  }
```

```bash
$ curl http://localhost/users?scope=verified

HTTP/1.1 200 OK
Content-Type: application/json

[
  {
    "name": "James Conrad",
    "email": "jamesconrad@fastmail.fm"
    "email_verified": true,
    "phone_verified": true
  }
]
```

### Search

Use the `q` parameter to perform a substring search across all fields.

```bash
$ curl http://localhost/users?q=james

HTTP/1.1 200 OK
Content-Type: application/json

[
  {
    "name": "James Conrad",
    "email": "jamesconrad@fastmail.fm"
  }, {
    "name": "Jim Huntington",
    "email": "jamesh@huntington.mx"
  }
]
```

Search behavior can be customized to change the parameter used for searching, as well as which attributes are included in the search, like so:

```javascript
var userResource = epilogue.resource({
    model: User,
    endpoints: ['/users', '/users/:id'],
    search: {
      param: 'searchOnlyUsernames',
      attributes: [ 'username' ]
    }
});
```

This would restrict substring searches to the ```username``` attribute of the User model, and the search parameter would be 'searchOnlyUsernames':

```bash
$ curl http://localhost/users?searchOnlyUsernames=james
```

By default, the substring search is performed using a ```{field} LIKE '%{query}%'``` pattern. However, this behavior can be customized by specifying a search operator. Valid operators include: `$like` (default), `$ilike`/`$iLike`, `$notLike`, `$notILike`, `$ne`, `$eq`, `$not`, `$gte`, `$gt`, `$lte`, `$lt`. All "\*like" operators can only be used against Sequelize.STRING or Sequelize.TEXT fields. For instance:

```javascript
var userResource = epilogue.resource({
    model: User,
    endpoints: ['/users', '/users/:id'],
    search: {
      operator: '$gt',
      attributes: [ 'age' ]
    }
});
```

When querying against a Sequelize.BOOLEAN field, you'll need to use the `$eq` operator. You can also add multiple search parameters by passing the search key an array of objects:

```javascript
var userResource = epilogue.resource({
    model: User,
    endpoints: ['/users', '/users/:id'],
    search: [
      {operator: '$eq', param: 'emailVerified', attributes: [ 'email_verified' ]},
      {param: 'searchOnlyUsernames', attributes: [ 'username' ]}
    ] 
});
```

### Sorting

Specify the `sort` parameter to sort results.  Values are field names, optionally preceded by a `-` to indicate descending order.  Multiple sort values may be separated by `,`.

```bash
$ curl http://localhost/users?sort=-name

HTTP/1.1 200 OK
Content-Type: application/json

[
  {
    "name": "Jim Huntington",
    "email": "jamesh@huntington.mx"
  }, {
    "name": "James Conrad",
    "email": "jamesconrad@fastmail.fm"
  }
]
```

Sort behavior can be customized to change the parameter used for sorting, as well as which attributes are allowed to be used for sorting like so:

```javascript
var userResource = epilogue.resource({
    model: User,
    endpoints: ['/users', '/users/:id'],
    sort: {
      param: 'orderby',
      attributes: [ 'username' ]
    }
});
```

This would restrict sorting to only the ```username``` attribute of the User model, and the sort parameter would be 'orderby':

```bash
$ curl http://localhost/users?orderby=username
```

Default sort criteria can be defined with the `default` attribute. The expected format for default sort criteria is exactly the same as if it was proceeding the `sort` parameter in the URL.

```javascript
var userResource = epilogue.resource({
    model: User,
    endpoints: ['/users', '/users/:id'],
    sort: {
      default: '-email,username'
    }
});
```
With this configuration, these two calls would result in the same data:

```bash
$ curl http://localhost/users
$ curl http://localhost/users?sort=-email,username
```

Note that the `sort` parameter in the URL will override your default criteria.

By default all attributes defined on the model are allowed to be sorted on. Sorting on a attribute not allowed will cause a 400 error to be returned with errors in the format:

```bash
$ curl http://localhost/users?sortby=invalid,-otherinvalid,valid

HTTP/1.1 400 BAD REQUEST
Content-Type: application/json

{
  "message": "Sorting not allowed on given attributes",
  "errors": ["invalid", "otherinvalid"]
}
```

### Pagination

List routes support pagination via `offset` or `page` and `count` query parameters.  Find metadata about pagination and number of results in the `Content-Range` response header. Pagination defaults to a default of 100 results per page, and a maximum of 1000 results per page.

```bash
# get the third page of results
$ curl http://localhost/users?offset=200&count=100

HTTP/1.1 200 OK
Content-Type: application/json
Content-Range: items 200-299/3230

[
  { "name": "James Conrad", ... },
  ...
]
```

Alternatively, you can specify that pagination is disabled for a given resource by passing false to the pagination property like so:

```javascript
var userResource = epilogue.resource({
    model: User,
    endpoints: ['/users', '/users/:id'],
    pagination: false
});
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
>
> ###### excludeAttributes
>
> Explicitly remove the specified list of attributes from read and list operations
>

### Milestones & Context

Check out the [Milestone docs](/docs/Milestones.md) for information on lifecycle
hooks that can be used with epilogue resources, and how to run custom code at
various points during a request.

## Protecting Epilogue REST Endpoints

To protect an endpoint, you must use [milestones](/docs/Milestones.md).

In order to protect and endpoint (for example, to require that only a logged in user
or user with the appropriate security token can access a resource) you need to use
the appropriate milestone hooks.

Below is an example of how to do this with standard Express middleware, which is
commonly used to protect resources.  Note that the callback functions required by
Epilogue milestones look similar to express middleware, but the third argument (`context`)
is different.

Suppose you have this resource:

```javascript
var userResource = rest.resource({
    model: User
});
```

To protect all endpoints, we'll use `userResource.all.auth`, a hook used to authorize the
endpoint before any operation (`create`, `list`, etc).  Suppose also we have an
express middlware function called `authorize(req, res, done)`.   This authorize
function might for example be a passport strategy such as `passport('local')`.

To authorize the endpoint, you would do this:

```javascript
userResource.all.auth(function (req, res, context) {
  return new Promise(function(resolve, reject) {
    authorize(req, res, function (arg) {
      if (arg) {
        // Middleware function returned an error; this means the operation
        // should not be authorized.
        res.status(401).send({message: "Unauthorized"});
        resolve(context.stop);
      } else {
        resolve(context.continue);
      }
  });
})
```

In this code, note that `userResource.all.auth` is simply reusing the express middleware
to do whatever authorization checking your code requires.  We are passing a custom
`done` function to the middleware, which resolves a promise as either `context.stop`
or `context.continue`, indicating to epilogue whether or not to proceed.  Note that
in the case where the transaction isn't authorized, epilogue won't proceed, so it
is your responsibility to send a response back to the client.

### Further Information on Protecting Endpoints

The milestone documentation provides many other hooks for finer-grained operations,
i.e. permitting all users to `list` but only some users to `delete` can be implemented
by using the same approach described above, with different milestones.

## License

Copyright (C) 2012-2015 David Chester
Copyright (C) 2014-2015 Matt Broadstone

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
