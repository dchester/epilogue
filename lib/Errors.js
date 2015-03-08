'use strict';

var util = require('util');

var EpilogueError = function(status, message, errors, cause) {
  this.name = 'EpilogueError';
  this.message = message || 'EpilogueError';
  this.errors = errors || [];
  this.status = status || 500;
  this.cause = cause;
  Error.captureStackTrace(this, this.constructor);
};
util.inherits(EpilogueError, Error);

var BadRequestError = function(message, errors, cause) {
  EpilogueError.call(this, 400, message || 'Bad Request', errors, cause);
  this.name = 'BadRequestError';
};
util.inherits(BadRequestError, EpilogueError);

var ForbiddenError = function(message, errors, cause) {
  EpilogueError.call(this, 403, message || 'Forbidden', errors, cause);
  this.name = 'ForbiddenError';
};
util.inherits(ForbiddenError, EpilogueError);

var NotFoundError = function(message, errors, cause) {
  EpilogueError.call(this, 404, message || 'Not Found', errors, cause);
  this.name = 'NotFoundError';
};
util.inherits(NotFoundError, EpilogueError);

var RequestCompleted = function() {
  Error.call(this);
  this.name = 'RequestCompleted';
};
util.inherits(RequestCompleted, Error);

module.exports = {
    NotFoundError: NotFoundError,
    BadRequestError: BadRequestError,
    EpilogueError: EpilogueError,
    ForbiddenError: ForbiddenError,
    RequestCompleted: RequestCompleted
};