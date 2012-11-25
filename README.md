# Epilogue

Create flexible REST endpoints and controllers from Sequelize models in your Express app

## Getting Started

Create a Sequelize model:
```javascript
var User = sequelize.define(...);
```

Create a resource with endpoints:

```javascript
var rest = require('epilogue');
rest.initialize({ app: app });

var users = rest.resource({
    model: User,
    endpoints: ['/users', '/users/:id']
});
```

On the server we now have the following controllers:

| Controller | Endpoint | Description |
|------------|----------|-------------|
| users.create | POST /user | Create a user |
| users.list | GET /users  | Get a listing of users |
| users.read | GET /users/:id | Get details about a user |
| users.update | POST /users/:id | Update a user|
| users.delete | DELETE /users/:id | Delete a user |


Our `users` resource has properties for each of the controller actions.  Controller actions in turn have hooks for setting and overriding behavior at each step of the request.  We have these milestones to work with: `start`, `auth`, `fetch`, `data`, `write`, `send`, and `complete`.

```javascript
// disallow deletes on users
users.delete.auth(function(req, res, context) {
	res.json(403, { error: "can't delete a user" });
	context.stop();
})
```

By default, `fetch`, `write`, and `send` milestones are defined, with the others left open.  We can set behavior for milestones directly as above, or we can add functionality before and after milestones too.

```javascript
// check the cache first
users.list.fetch.before(function(req, res, context) {
	context.instance = cache.get(context.criteria);
	context.continue();
})
```

## Epilogue Documentation

#### initialize()

Set defaults and give epilouge a reference to your express app.  Send the following parameters

###### app

A reference to the Express application

#### resource()

Create a resource and CRUD actions given a Sequelize model and endpoints.  Accepts these parameters:

###### model

Reference to a Sequelize model

###### endpoints

Create a resource, given a Sequelize model and endpoints.  Specify endpoints as an array with two sinatra-style URL paths in plural and singular form (e.g., `['/users', '/users/:id']`).

###### actions

Create only the specified list of actions for the resource.  Options include `create`, `list`, `read`, `update`, and `delete`.  Defaults to all.

### Milestones

Milestones provide opportunities to run custom application code at various important steps throughout the duration of the request.

Resources have properties for each controller action: `create`, `list`, `read`, `update`, and `delete`.  Also find a meta property `all` as a convenience for hooking into milestones across all controllers.  Each of those properties in turn has methods for setting custom behavior.

For each milestone on a given controller we accept a function specifying custom behavior.  Functions can expect request and response parameters as well as a context object.

#### start(f)

Run at the beginning of the request.  Defaults to passthrough.

#### auth(f)

Authorize the request.  Defaults to passthrough.

#### fetch(f)

Fetch data from the database for non-create actions according to `context.criteria`, writing to `context.instance`.

#### data(f)

Manipulate the data from the database if needed.  Defaults to passthrough.

#### write(f)

Write to the database for actions that write, reading from `context.attributes`.

#### send(f)

Send the HTTP response, headers along with the data in `context.instance`.

#### complete(f)

Run the specified function when the request is complete, regardless of the status of the response.

### Milestones & Context

Milestone methods take functions which can expect as paramaters a request, a response, a resource, and a context. Context objects contain key properties about the state of the resource at the given request milestone, as well as methods give back control.

###### context.instance

Instance of a dataset fetched via the supplied model.  May be undefined for early milestones prior to the fetching of the data.

###### context.attributes

Attribues supplied by the request, usually in anticipation of creating or updating an instance.

###### context.criteria

Criteria for fetching, usually supplied by request parameters.

###### context.continue()

Continue with the request, on through the rest of the milestones.

###### context.stop()

Indicate that this should be the last milestone to be processed.

## License

Copyright (C) 2012 David Chester

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
