
var backboneRequest = exports,
    Backbone = require('backbone'),
    _ = require('underscore'),
    request = require('request');
    querystring = require('querystring');

//
// Sync engine modeled after default backbone.js ajax syncing engine
// see: https://github.com/documentcloud/backbone/blob/master/backbone.js#L1316
//

backboneRequest.sync = function(method, model, options) {
  var type = methodMap[method];

  // Default options, unless specified.
  options || (options = {});

  // Default JSON-request options.
  var params = {type: type, dataType: 'json', headers: {}};

  // Ensure that we have a URL.
  if (!options.url) {
    params.url = getValue(model, 'url') || urlError();
  }

  // Ensure that we have the appropriate request data.
  if (!options.data && model && (method == 'create' || method == 'update')) {
    params.contentType = 'application/json';
    params.data = model.toJSON();
  }

  // For older servers, emulate JSON by encoding the request into an HTML-form.
  if (Backbone.emulateJSON) {
    params.contentType = 'application/x-www-form-urlencoded';
    params.data = params.data ? {model: params.data} : {};
  }

  // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
  // And an `X-HTTP-Method-Override` header.
  if (Backbone.emulateHTTP) {
    if (type === 'PUT' || type === 'DELETE') {
      if (Backbone.emulateJSON) params.data._method = type;
      params.type = 'POST';
      params.headers['X-HTTP-Method-Override'] = type;
    }
  }

  // Don't process data on a non-GET request.
  if (params.type !== 'GET' && !Backbone.emulateJSON) {
    params.processData = false;
  }

  _.extend(params, options);

  var requestParams = {
    url: params.url,
    method: params.type,
    json: true,
    headers: params.headers
  };

  if (requestParams.method === 'GET' && params.data) {
    requestParams.url += '?'+querystring.stringify(params.data);
  } else if (~['POST','PUT'].indexOf(requestParams.method) && params.data) {
    delete requestParams.json;
    requestParams.body = JSON.stringify(params.data);
    requestParams.headers['content-type'] = 'application/json';
  }
  
  request(requestParams, function (err, result, body) {
    if (err) {
      return options.error(err);
    }

    if (result.statusCode > 399) {
      var message = body.message || params.url + ' returned ' + result.statusCode;
      err = new Error(message);
      return options.error(err);
    }

    return options.success(body);
  });

};

var methodMap = {
  'create': 'POST',
  'update': 'PUT',
  'delete': 'DELETE',
  'read':   'GET'
};

// Helper function to get a value from a Backbone object as a property
// or as a function.
var getValue = function(object, prop) {
  if (!(object && object[prop])) return null;
  return _.isFunction(object[prop]) ? object[prop]() : object[prop];
};

// Throw an error when a URL is needed, and none is supplied.
var urlError = function() {
  throw new Error('A "url" property or function must be specified');
};
;
