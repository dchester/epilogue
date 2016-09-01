# Milestones

Milestones provide opportunities to run custom application code at various important steps throughout the duration of the request.

Resources have properties for each controller action: `create`, `list`, `read`, `update`, and `delete`.
Also find a meta property `all` as a convenience for hooking into milestones across all controllers.
Each of those properties in turn has methods for setting custom behavior.

For each milestone on a given controller we accept a function to specify custom behavior. If multiple functions are
registered for a hook they will be ran in order.

Functions can expect three parameters: a request, a response, and a context object.

For example to run before the main fetch milestone:

```javascript
// check the cache first
users.list.fetch.before(function(req, res, context) {
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

We have the following milestones:

- start - ran at the beginning of the request
- auth - authorize the request
- fetch - fetch data from the database
- data - transform the database data
- write - write to the database
- send - send response to the user
- complete - request completed

Only send is defined for all actions, and defaults to returning the json format of context.instance to the browser.

# Default Milestones for actions

## create

### write

Reads from context.attributes and req.body and creates a new instance of the model. Causes the response to have a
HTTP 201 response and sets the instance on context.instance

## delete

### fetch

Fetches from the database based on the endpoint parameters.
Sets context.instance to the data if it is found, otherwise throws a 404 error.

### write

Deletes the instance from the database and clears context.instance

## list

### fetch

Fetches a list from the database based on the URL parameters and endpoint configuration. Sets context.instance to the
returned list.

## read

### fetch

Fetches data from the database based on the request parameters and endpoint configuration and sets context.instance to
the returned object or throws a 404 error if none found that match

# Milestone Flow

Inside the function you must do one of the following:

1. return either `context.stop`, `context.skip` or `context.continue`
2. return a promise/thenable that resolves to `context.stop`, `context.skip` or `context.continue`
3. call either `context.stop()`, `context.skip()` or `context.continue()`
4. throw an error
5. call `context.error(err)` with an error to show

Examples:

```javascript
// example for 1
users.list.fetch.before(function(req, res, context) {
	return context.continue;
});

// example for 2 and 4
var ForbiddenError = require('epilogue').Errors.ForbiddenError;

users.list.fetch.before(function(req, res, context) {
	return checkLoggedIn(function(loggedIn) {
		if(!loggedIn) {
			throw new ForbiddenError();
		}
		return context.continue;
	});
});

// example for 3 and 5
users.list.fetch.before(function(req, res, context) {
	passport.authenticate('bearer', function(err, user, info) {
		if(err) {
			res.status(500);
			return context.stop();
		}

		if(user) {
			context.continue();
		} else {
			context.error(new ForbiddenError());
		}
	});
});

```

## context.continue

This says to continue on to the next hook in the chain.

## context.skip

This skips all the remaining functions on a milestone and skips to the start of the next one

## context.stop

This stops execution of all the remaining hooks and milestones and finishes the request. If you use context.stop you
should also set the response `res.status(200).json({})`

## context.error(error)

This should be called when throwing an error won't work. If you are returning a promise or working sync then throwing
an error will be better. If more than one parameter is passed to `context.error` then this function will assume the
syntax `context.error(status, message, [errors], [cause])` and will create a new EpilogueError out of them and will use
that instead.

# Errors

Throwing an error within a milestone function will cause the milestones to stop execution and the error message will be displayed to the user in the format:

```json
{
    "message": "Error message",
    "errors": []
}
```

To make use of this you must use an error that extends EpilogueError. Any error thrown that is not an instance of
EpilogueError will be shown as an Internal Server Error with it's errors array set to the error message.

In situations where throwing an error is not possible you can use `context.error(err)` with the error object or
alternatively call `context.error(status, message, [errors], [cause])` for it to build an EpilogueError for you with the
supplied parameters

The following errors are provided on epilogue.Errors:

## EpilogueError(statusCode, message, errors, cause)

This is the parent class you can extend to make your own errors

`statusCode` = the HTTP status code to return, defaults to 500
`message` = the error message to show in the message field, defaults to 'EpilogueError'
`errors` = an array of error strings to show in the message, defaults to []
`cause` = the original error that caused this error, defaults to undefined (no cause)

## BadRequestError(message, errors, cause)

This returns a HTTP 400 response

`message` = the error message to show in the message field, defaults to 'Bad Request'
`errors` = an array of error strings to show in the message, defaults to []
`cause` = the original error that caused this error, defaults to undefined (no cause)

## ForbiddenError(message, errors, cause)

This returns a HTTP 403 response

`message` = the error message to show in the message field, defaults to 'Forbidden'
`errors` = an array of error strings to show in the message, defaults to []
`cause` = the original error that caused this error, defaults to undefined (no cause)

## NotFoundError(message, errors, cause)

This returns a HTTP 404 response

`message` = the error message to show in the message field, defaults to 'Not Found'
`errors` = an array of error strings to show in the message, defaults to []
`cause` = the original error that caused this error, defaults to undefined (no cause)

# Overriding Error formatting

You can override how errors are formatted for a milestone by setting the `action.error` function.

For example:

```javascript
  resource.controllers.create.error = function(req, res, error) {
    res.status(500);
    res.json({message: 'Internal Error'});
  }
```

The error object passed will be an EpilogueError. If the error is wrapping another error (for example a ValidationError
from Sequelize) the original error can be found at `controllers.error.cause`

```javascript
  resource.controllers.create.error = function(req, res, error) {
    if(error.cause && error.cause instanceof sequelize.ValidationError) {
      res.status(400);
      res.json({message: 'Bad Request'});
    } else {
      res.status(500);
      res.json({message: 'Internal Error'});
    }
  }
```

The default implementation is to do the following:

```javascript
  res.status(err.status);
  res.json({
    message: err.message,
    errors: err.errors
  });
```

All Sequelize ValidationError objects are wrapped in a BadRequestError and are accessed on error.cause.
Any EpilogueError object are passed as-is and any other errors are wrapped in an EpilogueError and can be accessed on
error.cause
