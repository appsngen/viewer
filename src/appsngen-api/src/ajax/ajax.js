/*
* depends on: appstore.util, appstore.config
* */
(function (appstore) {
    'use strict';

    var debug = false;

    appstore.util.registerOnLoadHandler(function () {
        appstore.ajax = (function () {
            var createDeferred = function () {
                var successCallbacks = [],
                    errorCallbacks = [],
                    resolved = false,
                    rejected = false,
                    storedContext,
                    storedArgs,
                    notifySubscribers = function (callbacks, context, args) {
                        var i;

                        for (i = 0; i < callbacks.length; i++) {
                            callbacks[i].apply(context, args);
                        }

                        storedContext = context;
                        storedArgs = args;
                    };

                return {
                    resolve: function (context, args) {
                        if (!rejected && !resolved) {
                            notifySubscribers(successCallbacks, context, args);
                        }

                        resolved = true;
                    },
                    reject: function (context, args) {
                        if (!rejected && !resolved) {
                            notifySubscribers(errorCallbacks, context, args);
                        }

                        rejected = true;
                    },
                    promise: {
                        url: '',
                        success: function (handler) {
                            if (!rejected) {
                                if (resolved) {
                                    handler.apply(storedContext, storedArgs);
                                } else {
                                    successCallbacks.push(handler);
                                }
                            }

                            return this;
                        },
                        error: function (handler) {
                            if (!resolved) {
                                if (rejected) {
                                    handler.apply(storedContext, storedArgs);
                                } else {
                                    errorCallbacks.push(handler);
                                }
                            }

                            return this;
                        }
                    }
                };
            };
            var makeRequest = function (url, request, handler) {
                var xhr = new XMLHttpRequest(),
                    headerName;

                xhr.open(request.method || 'GET', url, true);
                for (headerName in request.headers) {
                    if (request.headers.hasOwnProperty(headerName)) {
                        xhr.setRequestHeader(headerName, request.headers[headerName]);
                    }
                }
                if (xhr.addEventListener) {
                    xhr.addEventListener('load', function (event) {
                        handler(event.target.response || event.target.responseText/*IE9 FIX*/, event.target.status);
                    }, false);
                } else {
                    xhr.onreadystatechange = function () {
                        /*IE7,8,9 FIX (handler called on .abort() with zero status)*/
                        if (xhr.readyState === 4 && xhr.status !== 0) {
                            handler(xhr.responseText, xhr.status);
                        }
                    };
                }

                xhr.send(request.body);

                return xhr;
            };

            var createAuthorizationHeader = function () {
                var token = appstore.config.dataSourceProxyToken;
                var tokenType = 'Bearer';

                return tokenType + ' ' + token;
            };
            var resolveResponse = function (paramsObj) {
                var deferred = paramsObj.deferred;
                var data = deferred.promise.parseResponse(paramsObj.response, paramsObj.statusCode, paramsObj.xhr);

                if (deferred.promise.isSuccessful(data, paramsObj.statusCode)) {
                    if (debug) {
                        appstore.util.console.log(paramsObj.dataSourceId, 'response: ', data, paramsObj.statusCode);
                    }

                    deferred.resolve(null, [data, paramsObj.statusCode]);
                } else {
                    if (debug) {
                        appstore.util.console.error(paramsObj.dataSourceId, 'response: ', data, paramsObj.statusCode);
                    }

                    deferred.reject(null, [data, paramsObj.statusCode]);
                }
            };
            var defaultIsSuccessful = function (parsedResponse, statusCode) {
                return statusCode === 200 && parsedResponse.error !== 'response_parser_error';
            };
            var parseAuthHeader = function (xhr) {
                var i,
                    error,
                    parsedErrorHeader,
                //Example error auth header 'WWW-Authenticate':
                //"Bearer realm="appsngen", error="invalid_token", error_description="Token cannot be parsed.""
                    errorHeader = xhr.getResponseHeader('WWW-Authenticate') || '';

                if (errorHeader) {
                    //get all words between ""
                    parsedErrorHeader = errorHeader.match(/"(.*?)"/gi);
                    //remove first element
                    parsedErrorHeader.shift();
                    for (i = 0; i < parsedErrorHeader.length; i++) {
                        // remove " from strings
                        parsedErrorHeader[i] = parsedErrorHeader[i].replace(/"/g, '');
                    }

                    error = {
                        error: parsedErrorHeader[0],
                        errorMessage: parsedErrorHeader[1]
                    };
                }

                return error;
            };
            var defaultParseResponse = function (response, statusCode, xhr) {
                var parsedResponse;

                if (response) {
                    try {
                        parsedResponse = JSON.parse(response);
                    } catch (e) {
                        parsedResponse = {error: 'response_parser_error', errorMessage: 'Unable to parse json.'};
                    }

                } else {
                    parsedResponse = parseAuthHeader(xhr) || {
                        error: 'response_parser_error',
                        errorMessage: 'Unknown response parse error.'
                    };
                }

                return parsedResponse;
            };
            var ajax = function (request) {
                var authorizationHeader = createAuthorizationHeader(),
                    deferred = createDeferred(),
                    xhr,
                    uri = appstore.util.createRequestUri(request),
                    endPoint = appstore.config.dataSourceProxyUrl,
                    requestUri = endPoint + '/data-sources/' + uri;

                request.headers = request.headers || {};

                request.headers['Authorization'] = authorizationHeader;
                request.headers['DS-Viewer'] = appstore.util.getTokenData().aud.user;
                request.headers['DS-Owner'] = appstore.util.getTokenData().aud.organization;

                deferred.promise.isSuccessful = defaultIsSuccessful;
                deferred.promise.parseResponse = defaultParseResponse;

                if (debug) {
                    appstore.util.console.log(request.dataSourceId, 'request: ', request, { url: requestUri });
                }

                xhr = makeRequest(requestUri, request, function (response, statusCode) {
                    resolveResponse({
                        deferred: deferred,
                        response: response,
                        statusCode: statusCode,
                        dataSourceId: request.dataSourceId,
                        xhr: xhr});
                });

                // extend deferred promise with abort method
                deferred.promise.abort = function () {
                    var aborted = false;

                    if (xhr.readyState !== 4) {
                        xhr.abort();
                        aborted = true;
                    }

                    return aborted;
                };

                return deferred.promise;
            };

            return ajax;
        }());
    });
}(appstore));