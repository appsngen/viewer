(function (window) {
    'use strict';
    var noop = function () {
        },
        localStorageObject = {},
        appstore = window.appstore || {},
        loadHandlers = [];

    appstore.util = {
        noop: noop,
        onLoadHandlers: loadHandlers, /* public for testing */
        registerOnLoadHandler: function (handler) {
            loadHandlers.push(handler);
        },
        runOnLoadHandlers: function () {
            var i;

            for (i = 0; i < loadHandlers.length; i++) {
                loadHandlers[i]();
            }
        },
        getURLParameter: function (name) {
            // TODO: add parameter cache
            var parameter = (new RegExp(name + '=' + '(.+?)(&|$)').exec(location.search) || [null, null])[1];

            if (parameter) {
                parameter = decodeURIComponent(parameter);
            }

            return parameter;
        },
        format: function (format) {
            var i;

            for (i = 1; i < arguments.length; i++) {
                format = format.replace(new RegExp('\\{' + (i - 1) + '\\}', 'gm'), arguments[i]);
            }
            return format;
        },
        console: window.console || {
            log: noop,
            error: noop,
            warn: noop,
            info: noop
        },
        localStorage: window.localStorage || {
            getItem: function (key) {
                return localStorageObject[key];
            },
            setItem: function (key, value) {
                localStorageObject[key] = value;
            },
            removeItem: function (key) {
                delete localStorageObject[key];
            },
            clear: function () {
                localStorageObject = {};
            },
            length: 0
        },
        postMessage: function (message, targetUrl, target) {
            target.postMessage(message, targetUrl);
        },
        receiveMessage: function (callback) {
            if (window.addEventListener) {
                window.addEventListener('message', callback, false);
            } else {
                window.attachEvent('onmessage', callback);
            }
        },
        isObject: function (obj) {
            return !!(obj && obj.constructor === Object);
        },
        stringifyParams: function (request) {
            var params = [], url, param;

            for (param in request) {
                if (request.hasOwnProperty(param)) {
                    if (request[param] instanceof Array) {
                        params.push(param + '=' + encodeURIComponent(request[param].join('|')));
                    } else {
                        params.push(param + '=' + encodeURIComponent([request[param]].join('')));
                    }
                }
            }
            url = params.join('&');

            return url;
        },
        createRequestUri: function (request) {
            var uri = request.dataSourceId;
            var params;

            if (request.path) {
                request.path = request.path.charAt(0) === '/' ? request.path : '/' + request.path;
                uri += request.path;
            }

            if (this.isObject(request.params)) {
                params = this.stringifyParams(request.params);

                if (params !== '') {
                    uri += '?' + params;
                }
            }

            return uri;
        },
        // jshint bitwise:false
        base64: (function () {

            var PADCHAR = '=';

            var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

            var getbyte64 = function (s, i) {
                var idx = ALPHA.indexOf(s.charAt(i));
                if (idx === -1) {
                    throw 'Cannot decode base64';
                }
                return idx;
            };

            var decode = function (s) {
                /**
                 * Fix for normalize base64 string if necessary.
                 */
                while (s.length % 4 !== 0) {
                    s += '=';
                }
                // convert to string
                s = '' + s;
                var pads, i, b10;
                var imax = s.length;
                if (imax === 0) {
                    return s;
                }

                if (imax % 4 !== 0) {
                    throw 'Cannot decode base64';
                }

                pads = 0;
                if (s.charAt(imax - 1) === PADCHAR) {
                    pads = 1;
                    if (s.charAt(imax - 2) === PADCHAR) {
                        pads = 2;
                    }
                    // either way, we want to ignore this last block
                    imax -= 4;
                }

                var x = [];
                for (i = 0; i < imax; i += 4) {
                    b10 = (getbyte64(s, i) << 18) | (getbyte64(s, i + 1) << 12) |
                        (getbyte64(s, i + 2) << 6) | getbyte64(s, i + 3);
                    x.push(String.fromCharCode(b10 >> 16, (b10 >> 8) & 0xff, b10 & 0xff));
                }

                switch (pads) {
                    case 1:
                        b10 = (getbyte64(s, i) << 18) | (getbyte64(s, i + 1) << 12) | (getbyte64(s, i + 2) << 6);
                        x.push(String.fromCharCode(b10 >> 16, (b10 >> 8) & 0xff));
                        break;
                    case 2:
                        b10 = (getbyte64(s, i) << 18) | (getbyte64(s, i + 1) << 12);
                        x.push(String.fromCharCode(b10 >> 16));
                        break;
                }
                return x.join('');
            };

            var getbyte = function (s, i) {
                var x = s.charCodeAt(i);
                if (x > 255) {
                    throw 'INVALID_CHARACTER_ERR: DOM Exception 5';
                }
                return x;
            };

            var encode = function (s) {
                if (arguments.length !== 1) {
                    throw 'SyntaxError: Not enough arguments';
                }

                var i, b10;
                var x = [];

                // convert to string
                s = '' + s;

                var imax = s.length - s.length % 3;

                if (s.length === 0) {
                    return s;
                }
                for (i = 0; i < imax; i += 3) {
                    b10 = (getbyte(s, i) << 16) | (getbyte(s, i + 1) << 8) | getbyte(s, i + 2);
                    x.push(ALPHA.charAt(b10 >> 18));
                    x.push(ALPHA.charAt((b10 >> 12) & 0x3F));
                    x.push(ALPHA.charAt((b10 >> 6) & 0x3f));
                    x.push(ALPHA.charAt(b10 & 0x3f));
                }
                switch (s.length - imax) {
                    case 1:
                        b10 = getbyte(s, i) << 16;
                        x.push(ALPHA.charAt(b10 >> 18) + ALPHA.charAt((b10 >> 12) & 0x3F) +
                            PADCHAR + PADCHAR);
                        break;
                    case 2:
                        b10 = (getbyte(s, i) << 16) | (getbyte(s, i + 1) << 8);
                        x.push(ALPHA.charAt(b10 >> 18) + ALPHA.charAt((b10 >> 12) & 0x3F) +
                            ALPHA.charAt((b10 >> 6) & 0x3f) + PADCHAR);
                        break;
                }
                return x.join('');
            };

            return {
                encode: encode,
                decode: decode
            };
        }()),
        // jshint bitwise:true
        getTokenData: function () {
            var token = appstore.util.getURLParameter('token');
            var tokenBody, tokenBodyObj;

            if(!token) {
                appstore.util.console.error('Token is empty. Token is required parameter.');
                return null;
            }

            tokenBody = token.split('.')[1];
            try {
                tokenBodyObj = JSON.parse(appstore.util.base64.decode(tokenBody));
            } catch (error) {
                appstore.util.console.error('Unable to parse token body', error.toString());
                return null;
            }

            return tokenBodyObj;
        },
        guid: (function () {
            var s4 = function () {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            };

            return function () {
                return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                    s4() + '-' + s4() + s4() + s4();
            };
        }())
    };

    window.appstore = appstore;
}(window));

(function (appstore) {
    'use strict';
    var prefs, widgetConfig, supportedBrowsers;

    appstore.config = {
        init: function(initialConfig, initialPrefs, initialSupportedBrowsers){
            widgetConfig = initialConfig;
            prefs = initialPrefs;
            supportedBrowsers = initialSupportedBrowsers;
        }
    };

    var Prefs = function () {
        return {
            getPrefsNames: function () {
                var name, names = [];

                for (name in prefs) {
                    if (prefs.hasOwnProperty(name)) {
                        names.push(name);
                    }
                }

                return names;
            },
            getString: function (prefName) {
                var value = '';
                if(prefs[prefName]){
                    value = prefs[prefName].value.toString();
                }

                return value;
            },
            getType: function (prefName) {
                var type = '';
                if(prefs[prefName]){
                    type = prefs[prefName].type.toString();
                }

                return type;
            },
            getPossibleValues: function (prefName) {
                var possibleValues = [];
                if (prefs[prefName]) {
                    possibleValues = prefs[prefName].possibleValues;
                }

                return possibleValues;
            }
        };
    };

    appstore.util.registerOnLoadHandler(function () {
        appstore.config.dataSourceProxyUrl = widgetConfig['appstore.api'].datasourceProxyUrl;
        appstore.config.datasourceActivProxyUrl = widgetConfig['appstore.api'].activProxyWebSocketUrl;
        appstore.config.dataSourceProxyToken = widgetConfig.authToken;
        appstore.config.unsupportedBrowserUrl = widgetConfig['appstore.api'].unsupportedBrowserUrl;
        appstore.config.metadata = widgetConfig['core.util']['appstore.events'];
        appstore.config.prefs = new Prefs();
        appstore.config.supportedBrowsers = supportedBrowsers;
    });
}(appstore));

/*
 * depends on: appstore.util, appstore.config
 * */
(function () {
    'use strict';

    appstore.util.registerOnLoadHandler(function () {
        appstore.dataSourceProxy = {
            getUrl: function (request) {
                var token = appstore.config.dataSourceProxyToken;
                if(!request.params){
                    request.params = {};
                }

                request.params.accessToken = token;
                var uri = appstore.util.createRequestUri(request);
                var endPoint = appstore.config.dataSourceProxyUrl;
                var requestUri = endPoint + '/data-sources/' + uri;

                return requestUri;
            }
        };
    });
}());
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
(function (appstore) {
    'use strict';

    appstore.util.registerOnLoadHandler(function () {
        appstore.socket = (function () {
            var socketInstance, errorCallback, dataCallback, isConnect = false;

            var stringifyParams = function (request) {
                var params = [], url, param;

                for (param in request) {
                    if (request.hasOwnProperty(param)) {
                        if (request[param] instanceof Array) {
                            params.push(param + '=' + encodeURIComponent(request[param].join('|')));
                        } else {
                            params.push(param + '=' + encodeURIComponent([request[param]].join('')));
                        }
                    }
                }
                url = params.join('&');

                return url;
            };

            var createRequestUrl = function (request) {
                var uri = request.dataSourceId;
                var params;

                if (request.path) {
                    request.path = request.path.charAt(0) === '/' ? request.path : '/' + request.path;
                    uri += request.path;
                }

                if (appstore.util.isObject(request.params)) {
                    params = stringifyParams(request.params);

                    if (params !== '') {
                        uri += '?' + params;
                    }
                }

                return uri;
            };

            var createAuthorizationSignature = function () {
                var token = appstore.config.dataSourceProxyToken;

                return token;
            };

            var checkConnection = function (url) {
                if (isConnect === false) {
                    var error = {
                        message: 'Can not connect to ' + url
                    };

                    errorCallback(error);
                }
            };
            var createSocketConnection = function (url, headers, timeout) {
                if (!window.WebSocket) {
                    throw new Error('Not supported browser for WebSocket');
                }

                try {
                    if (!headers) {
                        socketInstance = new WebSocket(url);
                    } else {
                        var sign = url.indexOf('?') === -1 ? '?' : '&';
                        var urlWithToken = url + sign + 'accessToken=' + encodeURIComponent(headers.Authorization);
                        socketInstance = new WebSocket(urlWithToken);
                    }
                } catch (exception) {
                    errorCallback(exception);

                    return false;
                }

                if (timeout !== undefined) {
                    setTimeout(function () {
                        checkConnection(url);
                    }, 5000);
                }

                socketInstance.onopen = function () {
                    isConnect = true;
                };

                socketInstance.onclose = function (event) {
                    if (!event.wasClean) {
                        var error = {
                            message: 'Bad disconnection { ' + 'Code: ' + event.code + ' Reason: ' + event.reason + ' } '
                        };
                        errorCallback(error);
                    }
                };

                socketInstance.onmessage = function (event) {
                    dataCallback(event.data);
                };

                socketInstance.onerror = function (error) {
                    errorCallback(error);
                };

                return true;
            };


            var socket = function (request, timeout) {
                var url = createRequestUrl(request),
                    endPoint = appstore.config.datasourceActivProxyUrl,
                    authorizationSignature = createAuthorizationSignature(),
                    requestUri = endPoint + '/' + url;
                dataCallback = request.dataCallback;
                errorCallback = request.errorCallback;
                request.headers = request.headers || {};

                if (socket.debug) {
                    appstore.util.console.log(request.dataSourceId, 'request: ', request, { url: requestUri });
                }

                request.headers['Authorization'] = authorizationSignature;

                createSocketConnection(requestUri, request.headers, timeout);

                return this;
            };

            var sendMessage = function (message) {
                socketInstance.send(message);
            };

            var closeConnection = function () {
                socketInstance.close();
            };

            socket.debug = false;

            return {
                createSocket: socket,
                sendMessage: sendMessage,
                close: closeConnection
            };
        }());
    });
}(appstore));
/* start of prefs/prefs.js */
/**
 * Provides possibilities to get the set of user preferences those can be redefined with url parameters.
 * @class appstore.prefs
 *
 * depends on: appstore.config, appstore.util
 */
(function (appstore){
    'use strict';
    appstore.util.registerOnLoadHandler(function() {
        //TODO: add prefs converting to real type.
        appstore.prefs = (function () {
            var prefs = {};

            var validatePref = function (value, type, possibleValues) {
                var isValid = false,
                    i, length;

                if (type === 'BOOL') {
                    value = value.toLowerCase();
                    isValid = value === 'true' || value === 'false';
                } else if (type === 'COLOR') {
                    isValid = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
                } else if (type === 'ENUM' || type === 'FONT_WEIGHT' ||
                    type === 'FONT_STYLE' || type === 'TEXT_DECORATION') {
                    for (i = 0, length = possibleValues.length; i < length; i++) {
                        if (possibleValues[i]) {
                            isValid = true;
                            break;
                        }
                    }
                } else if (type === 'INTEGER') {
                    isValid = /^\-?[0-9]+$/.test(value);
                } else if (type === 'FLOAT') {
                    isValid = /^(\-?([0-9]+|[0-9]+\.[0-9]+))$/.test(value);
                } else {
                    isValid = true;
                }

                return isValid;
            };

            var getDefaultPrefs = function () {
                var result = {}, i,
                    gadgetsPrefs = appstore.config.prefs,
                    prefsNames = gadgetsPrefs.getPrefsNames();

                for (i = 0; i < prefsNames.length; i++) {
                    result[prefsNames[i]] = gadgetsPrefs.getString(prefsNames[i]);
                }

                return result;
            };

            var extendWithParamsPrefs = function (defaultPrefs) {
                var gadgetsPrefs = appstore.config.prefs,
                    prefsNames = gadgetsPrefs.getPrefsNames(),
                    paramPref, i;

                for (i = 0; i < prefsNames.length; i++) {
                    paramPref = appstore.util.getURLParameter('X_' + prefsNames[i]);
                    if (paramPref !== null) {
                        defaultPrefs[prefsNames[i]] = paramPref;
                    }
                    // Get rid of this after adding prefs parsing
                    if (gadgetsPrefs.getType(prefsNames[i]) === 'BOOL') {
                        defaultPrefs[prefsNames[i]] = defaultPrefs[prefsNames[i]].toLowerCase();
                    }
                }
            };

            prefs = getDefaultPrefs();
            extendWithParamsPrefs(prefs);

            return {
                /**
                 * Gets all user preferences.
                 * @method get
                 * @return {object} hash set with all user preferences.
                 */
                get: function () {
                    return prefs;
                },

                /**
                 * Validates all user preferences.
                 * @method validate
                 * @return {object} object with validation status and error message is necessary.
                 */
                validate: function () {
                    var invalidFields = [], isValid, gadgetsPrefs = appstore.config.prefs, name;

                    for (name in prefs) {
                        if (prefs.hasOwnProperty(name)) {
                            isValid = validatePref(prefs[name], gadgetsPrefs.getType(name),
                                gadgetsPrefs.getPossibleValues(name));
                            if (!isValid) {
                                invalidFields.push(name);
                            }
                        }
                    }

                    if (invalidFields.length > 0) {
                        return { isValid: false, message: 'The following preferences: "' + invalidFields.join(', ') +
                            '" have invalid values. Please check them and try again.' };
                    }

                    return { isValid: true };
                }
            };
        } ());
    });
}(appstore));
(function (appstore) {
    'use strict';

    appstore.util.registerOnLoadHandler(function () {
        /**
         * Holds symbology resolving API.
         * @class appstore.symbology
         */
        appstore.symbology = (function () {
            /** @private Set of supported instrument pairs to resolve ([sourceInstr, targetInstr]). */
            var instrumentsMap = [];

            /** @private Validate properties of request */
            var validateRequest = function (request) {
                if (request === undefined || request === null) {
                    throw new Error('"request" parameter must be specified');
                }
                if (!request.targetType || typeof (request.targetType) !== 'string') {
                    throw new Error('"targetType" must be specified as string value.');
                }
                if (!request.sourceType || typeof (request.sourceType) !== 'string') {
                    throw new Error('"sourceType" must be specified as string value.');
                }
                if (!request.symbols || !(request.symbols instanceof Array) || request.symbols.length === 0) {
                    throw new Error('"symbols" must be specified as nonempty array value.');
                }
                if (request.preferredCountry !== undefined && typeof (request.preferredCountry) !== 'string') {
                    throw new Error('"preferredCountry" must be specified as string value.');
                }
                if (request.preferredExchange !== undefined && typeof (request.preferredExchange) !== 'string') {
                    throw new Error('"preferredExchange" must be specified as string value.');
                }
                if (!request.callback || typeof (request.callback) !== 'function') {
                    throw new Error('"callback" must be specified as function.');
                }
            };

            /** @private Check whether resolving is supported. */
            var validateInstrumentsMap = function (sourceType, targetType) {
                var isResolvable = false, i;

                for (i = 0; i < instrumentsMap.length && !isResolvable; i++) {
                    if (instrumentsMap[i].source.toUpperCase() === sourceType.toUpperCase() &&
                        instrumentsMap[i].target.toUpperCase() === targetType.toUpperCase()) {
                        isResolvable = true;
                    }
                }
                if (!isResolvable) {
                    throw new Error(appstore.util.format('Resolving from "{0}" to "{1}" is not supported.',
                        sourceType,
                        targetType));
                }
            };

            /** @private Get preferred country and exchange from preferences if they are not specified. */
            var getPrefs = function (request) {
                var prefs;

                prefs = appstore.prefs.get();

                if (request.preferredCountry === undefined) {
                    request.preferredCountry = prefs['GLOBAL_PREFERRED_COUNTRY'];
                }
                if (request.preferredExchange === undefined) {
                    request.preferredExchange = prefs['preferredExchange'];
                }
            };

            var cacheKey = 'appstore-symbology-cache';

            var getData = function () {
                var serializedData = appstore.util.localStorage.getItem(cacheKey);
                if (!serializedData) {
                    return {};
                }

                var data = JSON.parse(serializedData);
                return data;
            };

            // checks whether symbology resolution item expired or not
            var isExpired = function (item) {
                return (((new Date()) - (new Date(item.timestamp))) / 1000) > item.ttl;
            };

            // removes expired items from symbology cache
            var removeExpired = function (data) {
                var key, cacheItem;

                for (key in data) {
                    if (data.hasOwnProperty(key)) {
                        cacheItem = data[key];
                        if (isExpired(cacheItem)) {
                            delete data[key];
                        }
                    }
                }
            };

            // stores symbology cache in local storage
            var storeData = function (data) {
                // serialize data
                var serializedData = JSON.stringify(data);
                // try to store data
                try {
                    appstore.util.localStorage.setItem(cacheKey, serializedData);
                } catch (e1) {
                    // something wrong
                    // probably storage size quota has been exceeded
                    // remove expired items
                    removeExpired(data);
                    // try to store data once again
                    serializedData = JSON.stringify(data);
                    try {
                        appstore.util.localStorage.setItem(cacheKey, serializedData);
                    } catch (e2) {
                        // if we have not enough space - clear all stored data
                        appstore.util.localStorage.removeItem(cacheKey);
                    }
                }
            };

            var getKey = function(request) {
                return [
                    request.symbols,
                    request.sourcetype,
                    request.targettype,
                    request.preferredcountry,
                    request.preferredexchange
                ].join('|');
            };

            var cache = {
                get: function (key) {
                    var data = getData();
                    var cacheItem = data[key];
                    if (!cacheItem) {
                        return null;
                    }

                    if (isExpired(cacheItem)) {
                        delete data[key];
                        storeData(data);
                        return null;
                    }

                    return cacheItem.value;
                },
                set: function (key, value, ttl) {
                    var cacheItem = {
                        ttl: ttl,
                        value: value,
                        timestamp: new Date()
                    };

                    var data = getData();
                    data[key] = cacheItem;
                    storeData(data);
                }
            };

            return /** @scope appstore.symbology */ {
                /**
                 * Resolve one instrument type to another.
                 * @method resolve
                 * @param {object} request Contains a set data for resolving.
                 * @param {array} request.symbols Symbols to resolve.
                 * @param {string} request.sourceType Type of represented symbols.
                 * @param {string} request.targetType Instrumnet type to resolve in.
                 * @param {string} request.preferredCountry Preferred country code to filter results.
                 * If not specified default value will be taken from preferences.
                 * @param {string} request.preferredExchange Preferred exchange code to filter results.
                 * If not specfied default value will be taken from preferences.
                 * @param {function} request.callback Called when symbols will be resolved.
                 * First parameter will be contain response.
                 */
                resolve: function (request) {
                    validateRequest(request);
                    validateInstrumentsMap(request.sourceType, request.targetType);
                    getPrefs(request);
                    var params = {
                        symbols: request.symbols,
                        sourcetype: request.sourceType,
                        targettype: request.targetType
                    };

                    params.preferredcountry = request.preferredCountry || '';
                    params.preferredexchange = request.preferredExchange || '';

                    var cachedResponse = cache.get(getKey(params));
                    if (cachedResponse) {
                        setTimeout(function () {
                            request.callback(cachedResponse);
                        }, 0);
                    } else {
                        appstore.ajax({
                            dataSourceId : 'tr.symbology',
                            path : 'resolve',
                            params: params
                        }).success(function (response) {
                                cache.set(getKey(params), response.data, 24 * 60 * 60); // one day ttl
                                request.callback(response);
                            }).error(function (error) {
                                request.errorCallback(error);
                            });
                    }
                },

                /**
                 * @method getResolveMap
                 * @return {Array} the set of supported resolutions
                 * */
                getResolveMap : function () {
                    return instrumentsMap;
                },

                /**
                 * @method init
                 * */
                init: function (instruments) {
                    var i;

                    instrumentsMap.length = 0;

                    for (i = 0; i < instruments.length; i++) {
                        instrumentsMap.push(instruments[i]);
                    }
                }
            };
        } ());

        appstore.symbology.init([
            { source : 'RIC', target: 'RIC' },
            { source : 'RIC', target: 'ILX' },
            { source : 'RIC', target: 'CUSIP' },
            { source : 'RIC', target: 'SEDOL' },
            { source : 'RIC', target: 'ISIN' },
            { source : 'RIC', target: 'TICKER' },
            { source : 'RIC', target: 'PrimaryRepoNo' },
            { source : 'RIC', target: 'LipperId' },

            { source : 'ILX', target: 'RIC' },
            { source : 'ILX', target: 'ILX' },
            { source : 'ILX', target: 'CUSIP' },
            { source : 'ILX', target: 'SEDOL' },
            { source : 'ILX', target: 'ISIN' },
            { source : 'ILX', target: 'TICKER' },

            { source : 'CUSIP', target: 'RIC' },
            { source : 'CUSIP', target: 'ILX' },
            { source : 'CUSIP', target: 'CUSIP' },
            { source : 'CUSIP', target: 'SEDOL' },
            { source : 'CUSIP', target: 'ISIN' },
            { source : 'CUSIP', target: 'TICKER' },

            { source : 'SEDOL', target: 'RIC' },
            { source : 'SEDOL', target: 'ILX' },
            { source : 'SEDOL', target: 'CUSIP' },
            { source : 'SEDOL', target: 'SEDOL' },
            { source : 'SEDOL', target: 'ISIN' },
            { source : 'SEDOL', target: 'TICKER' },

            { source : 'ISIN', target: 'RIC' },
            { source : 'ISIN', target: 'ILX' },
            { source : 'ISIN', target: 'CUSIP' },
            { source : 'ISIN', target: 'SEDOL' },
            { source : 'ISIN', target: 'ISIN' },
            { source : 'ISIN', target: 'TICKER' },
            { source : 'ISIN', target: 'PrimaryRic' },

            { source : 'TICKER', target: 'RIC' },
            { source : 'TICKER', target: 'ILX' },
            { source : 'TICKER', target: 'CUSIP' },
            { source : 'TICKER', target: 'SEDOL' },
            { source : 'TICKER', target: 'ISIN' },
            { source : 'TICKER', target: 'TICKER' },
            { source : 'TICKER', target: 'LipperId' },

            { source : 'LipperId', target: 'Ric' },
            { source : 'LipperId', target: 'Ticker' }
        ]);
    });
}(appstore));
/*
 * depends on: appstore.util
 * */
(function (appstore) {
    'use strict';

    /**
     * @fileoverview subscribe/publish mechanism.
     */
    appstore.events = (function () {
        /**
         * Contains set of channels with app ids subscribed to them.
         * It is necessary to forward messages between apps.
         * Thus the container is a kind of a router.
         * */
        var underlyingWidgetSubscriptions = {};

        /** The container subscriptions. */
        var currentLevelSubscriptions = {};

        /** Contains last data for every channel. */
        // TODO: add TTL to fix possible bugs with ancient events
        var context = [];
        var contextStorageKey = 'appstore-events-context';

        var storeContext = function (newContext) {
            var serializedContext;
            // serialize data
            serializedContext = JSON.stringify(newContext);
            // try to store data
            try {
                appstore.util.localStorage.setItem(contextStorageKey, serializedContext);
            } catch (e) {
                // something wrong
                // probably storage size quota has been exceeded
                // if we have not enough space - clear all stored events
                localStorage.removeItem(contextStorageKey);
            }
        };

        var getCurrentFrameId = function() {
            return appstore.util.getURLParameter('frameId') || window.name || '.';
        };

        var getStoredContext = function () {
            var storedContext;
            var serializedContext = appstore.util.localStorage.getItem(contextStorageKey);
            if (!serializedContext) {
                storedContext = [];
            } else {
                storedContext = JSON.parse(serializedContext);
                // workaround for IE8
                if (!(storedContext instanceof Array)) {
                    storedContext = [];
                }
            }

            return storedContext;
        };

        var storeEventToContext = function (event) {
            var i;

            // add event at the beginning of context
            context.unshift({
                channel: event.channel,
                data: event.data
            });
            // remove any other appearance of such event
            for (i = 1; i < context.length; i++) {
                if (context[i].channel === event.channel) {
                    context.splice(i, 1);
                    break;
                }
            }

            storeContext(context);
        };

        var getContext = function () {
            // return context copy
            return getStoredContext();
        };

        var setContext = function (newContext) {
            // store context copy
            storeContext(newContext);
            context = getStoredContext();
        };

        var resetContext = function () {
            context = [];
            appstore.util.localStorage.removeItem(contextStorageKey);
        };

        /** Parses message and passes only event messages from the apps. */
        var parseMessage = function (data) {
            var message;

            try {
                message = JSON.parse(data);
            } catch (ignore) {
            }

            if (message && message.type && message.sender && message.data) {
                return message;
            }

            return { type: 'unsupported', data: {}};
        };

        /** Forwards message to the top in case of this container is an iframe. */
        var forwardMessageToTopIfNecessary = function (message) {
            var logMessage, logFormat;
            var newMessage;
            var parentUrl = appstore.util.getURLParameter('parent');
            var currentFrameId = getCurrentFrameId();

            if (window !== window.parent && parentUrl) {
                // Clone message
                newMessage = JSON.parse(JSON.stringify(message));

                // Replace the sender property to this container.
                newMessage.sender = currentFrameId;

                if (appstore.events.debug) {
                    logFormat = 'Sender: "{0}" sends message to the top receiver in channel: "{1}" with message body:';
                    logMessage = appstore.util.format(logFormat, currentFrameId, newMessage.data.channel);
                    appstore.util.console.log(logMessage, newMessage);
                }

                appstore.util.postMessage(JSON.stringify(newMessage), parentUrl, window.parent);
            }
        };

        /** Saves subscribed currentFrameId and forwards subscribe message to the top. */
        var resolveSubscribeMessageFromUnderlyingWidget = function (message) {
            var logMessage, logFormat;
            // Save the subscribed apps ids.
            var channelSubscriptions = underlyingWidgetSubscriptions[message.data.channel];
            var currentFrameId = getCurrentFrameId();

            if (!channelSubscriptions) {
                channelSubscriptions = {};
            }

            if (appstore.events.debug) {
                logFormat = 'Receiver: "{0}" subscribes underlying sender: "{1}" for channel: "{2}"';
                logMessage = appstore.util.format(logFormat, currentFrameId, message.sender, message.data.channel);
                appstore.util.console.log(logMessage);
            }

            channelSubscriptions[message.sender] = true;
            underlyingWidgetSubscriptions[message.data.channel] = channelSubscriptions;

            // subscribe to events from top
            forwardMessageToTopIfNecessary(message);
        };

        /** Removes the subscriber currentFrameId and forwards unsubscribe message to the top. */
        var resolveUnsubscribeMessageFromUnderlyingWidget = function (message) {
            var logMessage, logFormat;
            var currentFrameId = getCurrentFrameId();

            if (appstore.events.debug) {
                logFormat = 'Receiver: "{0}" unsubscribes underlying sender: "{1}" from channel: "{2}"';
                logMessage = appstore.util.format(logFormat, currentFrameId, message.sender, message.data.channel);
                appstore.util.console.log(logMessage);
            }

            if (underlyingWidgetSubscriptions[message.data.channel]) {
                delete underlyingWidgetSubscriptions[message.data.channel][message.sender];
            }

            if (noSubsribersForChannel(message.channel)) {
                forwardMessageToTopIfNecessary(message);
            }
        };

        var logDebugDataIfNecessary = function (subscriber, message) {
            var logMessage, logFormat;
            var currentFrameId = getCurrentFrameId();

            if (appstore.events.debug) {
                logFormat = 'Sender: "{0}" sends message to the underlying receiver: "{1}" in channel: "{2}"' +
                    ' with message body:';
                logMessage = appstore.util.format(logFormat, currentFrameId, subscriber, message.data.channel);
                appstore.util.console.log(logMessage, message);
            }
        };

        /** Sends publish event from the message to the all subscribed apps. */
        var sendMessageToUnderlyingWidgets = function (message) {
            var targetSubscribers, subscriber;
            var targetIframe, jsonMessage, newMessage;
            var currentFrameId = getCurrentFrameId();

            // Get appIds that subscribed to the channel
            targetSubscribers = underlyingWidgetSubscriptions[message.data.channel] || {};

            // Send the message to every widget that subscribed to the channel except the sender itself.
            for (subscriber in targetSubscribers) {
                if (targetSubscribers.hasOwnProperty(subscriber) && subscriber !== message.sender) {
                    targetIframe = document.getElementById(subscriber);

                    if (targetIframe) {
                        // Clone message
                        newMessage = JSON.parse(JSON.stringify(message));

                        // Replace the sender property to this container.
                        newMessage.sender = currentFrameId;

                        logDebugDataIfNecessary(subscriber, newMessage);

                        jsonMessage = JSON.stringify(newMessage);
                        appstore.util.postMessage(jsonMessage, targetIframe.src, targetIframe.contentWindow);
                    }
                }
            }
        };

        /** forward publish message to the apps subscribers and fire event
         * if the container is subscribed to the channel form message. */
        var resolvePublishMessageFromAnySource = function (message, fromTop) {
            var logMessage, logFormat;
            var currentLevelHandler;
            var currentFrameId = getCurrentFrameId();

            // distribute message to underlying widgets in any case: from top, from bottom, from current level
            sendMessageToUnderlyingWidgets(message);

            // Forward message to top only in case the message didn't received from the top itself.
            if (!fromTop) {
                forwardMessageToTopIfNecessary(message);
            }

            // Save received data in event context
            storeEventToContext(message.data);

            // Check the current level subscriptions and fire event
            // if the current level subscribed to the channel from the message and sender is not the current level.
            currentLevelHandler = currentLevelSubscriptions[message.data.channel];

            if (currentLevelHandler && message.sender !== currentFrameId) {
                if (appstore.events.debug) {
                    logFormat = 'Receiver: "{0}" calls message handler in channel: "{1}" from sender: "{2}" with data:';
                    logMessage = appstore.util.format(logFormat, currentFrameId, message.data.channel, message.sender);
                    appstore.util.console.log(logMessage, message.data.data);
                }

                currentLevelHandler(message.data.channel, message.data.data, message.sender);
            }
        };

        var noSubsribersForChannel = function (channel) {
            var sender, subscriptions = [];

            if (underlyingWidgetSubscriptions[channel]) {
                for (sender in underlyingWidgetSubscriptions[channel]) {
                    if (underlyingWidgetSubscriptions[channel].hasOwnProperty(sender)) {
                        subscriptions.push(sender);
                    }
                }
            }

            if (currentLevelSubscriptions[channel]) {
                subscriptions.push(getCurrentFrameId());
            }

            return subscriptions.length === 0;
        };

        context = getStoredContext();

        // Handle messages from the apps
        appstore.util.receiveMessage(function (event) {
            var logMessage, logFormat;
            var message = parseMessage(event.data);
            var isFromTop = event.source === window.parent;
            var currentFrameId = getCurrentFrameId();

            if (message.type !== 'unsupported') {
                if (appstore.events.debug) {
                    logFormat = 'Receiver: "{0}" got from sender: "{1}" message in channel: "{2}" with message body:';
                    logMessage = appstore.util.format(logFormat, currentFrameId, message.sender, message.data.channel);
                    appstore.util.console.log(logMessage, message);
                }

                if (message.type === 'subscribe') {
                    // process subscribe only from bottom level, no sense to parse subscribe from top:
                    // publish message is always sent from bottom to top (publish doesn't depend on top subscribers)
                    if (!isFromTop) {
                        resolveSubscribeMessageFromUnderlyingWidget(message);
                    }
                } else if (message.type === 'publish') {
                    // publish message is free to pass from any level to any
                    resolvePublishMessageFromAnySource(message, isFromTop);
                } else if (message.type === 'unsubscribe') {
                    // process unsubscribe only from bottom level, no sense to parse unsubscribe from top:
                    // publish message is always sent from bottom to top (publish doesn't depend on top subscribers)
                    if (!isFromTop) {
                        resolveUnsubscribeMessageFromUnderlyingWidget(message);
                    }
                }
            } else if (appstore.events.debug) {
                logFormat = 'Receiver: "{0}" skipped unsupported event:';
                logMessage = appstore.util.format(logFormat, currentFrameId);
                appstore.util.console.log(logMessage, event);
            }
        });

        return /** @scope appstore.events */ {
            /**
             * Subscribes the current level to the channel.
             * @param {String} channel Channel.
             * @param {Function} handler Event handler.
             * @return {Object} Chain.
             * */
            subscribe: function (channel, handler) {
                var logMessage, logFormat;
                var currentFrameId = getCurrentFrameId();
                // Create event message like just received from an app but with current currentFrameId sender
                // and send to top
                var message = {
                    type: 'subscribe',
                    sender: currentFrameId,
                    data: {
                        channel: channel
                    }
                };

                // Save subscription on the current level side
                currentLevelSubscriptions[channel] = handler;

                if (appstore.events.debug) {
                    logFormat = 'Sender: "{0}" subsribes for the channel: "{1}"';
                    logMessage = appstore.util.format(logFormat, currentFrameId, channel);
                    appstore.util.console.log(logMessage);
                }

                forwardMessageToTopIfNecessary(message);

                return this;
            },

            /**
             * Unsubscribes the current level from the channel.
             * @param {String} channel Channel.
             * @return {Object} Chain.
             * */
            unsubscribe: function (channel) {
                var logMessage, logFormat;
                var currentFrameId = getCurrentFrameId();
                // Create event message like just received from an app but with current currentFrameId sender
                // and send to top
                var message = {
                    type: 'unsubscribe',
                    sender: currentFrameId,
                    data: {
                        channel: channel
                    }
                };

                // Just delete subscription if it exists.
                delete currentLevelSubscriptions[channel];

                if (appstore.events.debug) {
                    logFormat = 'Sender: "{0}" unsubsribes from the channel: "{1}"';
                    logMessage = appstore.util.format(logFormat, currentFrameId, channel);
                    appstore.util.console.log(logMessage);
                }

                if (noSubsribersForChannel(channel)) {
                    forwardMessageToTopIfNecessary(message);
                }

                return this;
            },

            /**
             * Publishes the data to the channel.
             * @param {String} channel Channel.
             * @param {Object} data Data.
             * @return {Object} Chain.
             * */
            publish: function (channel, data) {
                var logMessage, logFormat;
                var currentFrameId = getCurrentFrameId();
                // Create event message like just received from an app but with current currentFrameId sender.
                var message = {
                    type: 'publish',
                    sender: currentFrameId,
                    data: {
                        channel: channel
                    }
                };

                if (appstore.events.debug) {
                    logFormat = 'Sender: "{0}" publishes event in channel: "{1}" with data:';
                    logMessage = appstore.util.format(logFormat, currentFrameId, channel);
                    appstore.util.console.log(logMessage, data);
                }

                // Clone the data before 'sending'.
                message.data.data = JSON.parse(JSON.stringify(data));

                // and handle like an async message from a widget.
                setTimeout(function () {
                    resolvePublishMessageFromAnySource(message, false /* not from top */);
                }, 0);

                return this;
            },

            /** Contains last data for every channel. */
            getContext: getContext,
            setContext: setContext,
            resetContext: resetContext,
            /**
             * Specify whether to log events to the console.
             * */
            debug: false
        };
    }());
}(appstore));
/* end of events/events.js */
/*
 * depends on: appstore.util, appstore.config
 * */
(function (appstore) {
    'use strict';

    appstore.util.registerOnLoadHandler(function () {
        var metadata = appstore.config.metadata || {};
        var message = JSON.stringify({
            type: 'metadataReadyCall',
            frameId: appstore.util.getURLParameter('frameId'),
            metadata: metadata
        });

        var parentUrl = appstore.util.getURLParameter('parent');

        appstore.util.postMessage(message, parentUrl, window.parent);
    });
}(appstore));
/*
 * depends on: appstore.util
 * */
(function (appstore) {
    'use strict';

    var dynamicHeightEnabled = true;

    appstore.dynamicHeight = {
        enable: function () {
            dynamicHeightEnabled = true;
        },
        disable: function () {
            dynamicHeightEnabled = false;
        }
    };

    appstore.util.receiveMessage(function (event) {
        var message;
        var replyMessage;
        var iframe;

        try {
            message = JSON.parse(event.data);
        } catch (ignore) {
        }

        if (message && message.type === 'adjustHeightCall' && message.frameId && message.data) {
            if (dynamicHeightEnabled) {
                iframe = document.getElementById(message.frameId);

                if (iframe) {
                    iframe.style.height = message.data.height + 'px';
                    replyMessage = JSON.stringify({
                        type: 'adjustHeightReply',
                        data: message.data
                    });

                    appstore.util.postMessage(replyMessage, iframe.src, iframe.contentWindow);
                }
            }
        }
    });
}(appstore));
/**
 * @fileoverview
 * Represent possibility to adjust height of application to the provided value or application content height.
 * Uses the Shindig RPC mechanism to send value to the parent window.
 * Note value is sent twice for IE
 * first time - document.body.offsetHeight,
 * second time - document.documentElement.scrollHeight.
 *
 *
 * depends on: appstore.util
 */
(function (appstore) {
    'use strict';

    appstore.util.registerOnLoadHandler(function () {
        var isIE = navigator.userAgent.search(/MSIE/) > 0;

        appstore.adjustHeight = (function () {
            var sendHeight = function (height, isFirst) {
                var message = JSON.stringify({
                    type: 'adjustHeightCall',
                    frameId: appstore.util.getURLParameter('frameId'),
                    data: { height : height, isFirst : isFirst }
                });

                var parentUrl = appstore.util.getURLParameter('parent');

                appstore.util.postMessage(message, parentUrl, window.parent);
            };

            var completeHandler;
            var previousTimeout;
            var throttleTime = 50;

            // back handler for height adjusting confirmation.
            appstore.util.receiveMessage(function (event) {
                var message;

                try {
                    message = JSON.parse(event.data);
                } catch (ignore) {
                }

                if (message && message.type === 'adjustHeightReply' && message.data) {
                    if (message.data.isFirst && isIE) {
                        sendHeight(document.documentElement.scrollHeight, false);
                    } else if (typeof completeHandler === 'function') {
                        completeHandler();
                    }
                }
            });

            return function (height) {
                clearTimeout(previousTimeout);

                previousTimeout = setTimeout(function () {
                    // In case height is not specified, document height will be used to adjust.
                    if (isNaN(height)) {
                        height = isIE ? document.body.offsetHeight : document.documentElement.offsetHeight;
                        sendHeight(height, true);
                    } else {
                        sendHeight(height, false);
                    }
                }, throttleTime);

                return {
                    complete: function (callback) {
                        completeHandler = callback;
                    }
                };
            };
        }());
    });
}(appstore));

(function (appstore) {
    'use strict';

    appstore.util.registerOnLoadHandler(function() {
        appstore.resourceUrl = '';
    });
}(appstore));
/*
 * depends on: appstore.util, appstore.config
 * */
(function (appstore) {
    'use strict';

    appstore.util.registerOnLoadHandler(function () {
        /* Chrome|Android|OmniWeb|Safari|iCab|Konqueror|Firefox|Camino|Netscape|IE|Mozilla */
        var supportedBrowsers = appstore.config.supportedBrowsers || [];

        var BrowserDetect = {
            init: function () {
                this.browser = this.searchString(this.dataBrowser) || 'An unknown browser';
                this.version = this.searchVersion(navigator.userAgent) || this.searchVersion(navigator.appVersion) ||
                    'an unknown version';
                this.OS = this.searchString(this.dataOS) || 'an unknown OS';
            },
            searchString: function (data) {
                var i, dataString, dataProp;

                for (i = 0; i < data.length; i++) {
                    dataString = data[i].string;
                    dataProp = data[i].prop;
                    this.versionSearchString = data[i].versionSearch || data[i].identity;
                    if (dataString) {
                        if (dataString.indexOf(data[i].subString) !== -1) {
                            return data[i].identity;
                        }
                    } else if (dataProp) {
                        return data[i].identity;
                    }
                }
            },
            searchVersion: function (dataString) {
                var index = dataString.indexOf(this.versionSearchString);
                if (index === -1) {
                    return;
                }

                return parseFloat(dataString.substring(index + this.versionSearchString.length + 1));
            },
            dataBrowser: [
                {
                    string: navigator.userAgent,
                    subString: 'Chrome',
                    identity: 'Chrome'
                },
                {
                    string: navigator.userAgent,
                    subString: 'Android',
                    identity: 'Android'
                },
                {
                    string: navigator.userAgent,
                    subString: 'OmniWeb',
                    versionSearch: 'OmniWeb/',
                    identity: 'OmniWeb'
                },
                {
                    string: navigator.vendor,
                    subString: 'Apple',
                    identity: 'Safari',
                    versionSearch: 'Version'
                },
                {
                    prop: window.opera,
                    identity: 'Opera',
                    versionSearch: 'Version'
                },
                {
                    string: navigator.vendor,
                    subString: 'iCab',
                    identity: 'iCab'
                },
                {
                    string: navigator.vendor,
                    subString: 'KDE',
                    identity: 'Konqueror'
                },
                {
                    string: navigator.userAgent,
                    subString: 'Firefox',
                    identity: 'Firefox'
                },
                {
                    string: navigator.vendor,
                    subString: 'Camino',
                    identity: 'Camino'
                },
                {
                    // for newer Netscapes (6+)
                    string: navigator.userAgent,
                    subString: 'Netscape',
                    identity: 'Netscape'
                },
                { /* IE 8-10 */
                    string: navigator.userAgent,
                    subString: 'MSIE',
                    identity: 'IE',
                    versionSearch: 'MSIE'
                },
				{ /* IE 11 */
                    string: navigator.userAgent,
                    subString: 'Trident',
                    identity: 'IE',
                    versionSearch: 'rv'
                },
                {
                    string: navigator.userAgent,
                    subString: 'Gecko',
                    identity: 'Mozilla',
                    versionSearch: 'rv'
                },
                {
                    // for older Netscapes (4-)
                    string: navigator.userAgent,
                    subString: 'Mozilla',
                    identity: 'Netscape',
                    versionSearch: 'Mozilla'
                }
            ],
            dataOS: [
                {
                    string: navigator.platform,
                    subString: 'Win',
                    identity: 'Windows'
                },
                {
                    string: navigator.platform,
                    subString: 'Mac',
                    identity: 'Mac'
                },
                {
                    string: navigator.userAgent,
                    subString: 'iPhone',
                    identity: 'iPhone/iPod'
                },
                {
                    string: navigator.userAgent,
                    subString: 'Android',
                    identity: 'Android'
                },
                {
                    string: navigator.platform,
                    subString: 'Linux',
                    identity: 'Linux'
                }
            ]
        };
        var isBrowserSupported = function () {
            var i;
            var isSupported = false;

            if (!supportedBrowsers.length) {
                return true;
            }

            for (i = 0; i < supportedBrowsers.length; i++) {
                if (supportedBrowsers[i].browser.toLowerCase() === BrowserDetect.browser.toLowerCase()) {
                    if (!supportedBrowsers[i].version || BrowserDetect.version >= supportedBrowsers[i].version) {
                        isSupported = true;
                        break;
                    }
                }
            }

            return isSupported;
        };
		
        BrowserDetect.init();
		
        if (!isBrowserSupported()) {
            var browserList = [], supportedBrowser, unsupportedBrowserUrl, i;

            for (i = 0; i < supportedBrowsers.length; i++) {
                supportedBrowser = supportedBrowsers[i];
                browserList.push(supportedBrowser.browser + ' ' + supportedBrowser.version);
            }

            appstore.cancelReady();
            unsupportedBrowserUrl = appstore.config.unsupportedBrowserUrl;
            location.href = unsupportedBrowserUrl + '?supportedBrowsers=' + browserList.join(',');
        }
    });
}(appstore));
(function (appstore) {
    'use strict';
    /**
     * @fileoverview Integration API for easy creating applications in third party client sites.
     */

    /**
     * Creates an iframe application.
     * @param {string} id This parameter will be assigned the iframe id and iframe name,
     * so avoid using of whitespaces in this parameter.
     * @param {HTMLElement} container Application container.
     * @param {object} attrs key-value collection of attrs for the iframe application.
     * @param {string } signedUrl the application URL.
     */
    appstore.addApplication = function (id, container, attrs, signedUrl) {
        var iframeText = '<iframe', attr,
            containerElementId = container;

        var isDomElement = function (element) {
            return (element && typeof element === 'object' && element.nodeType && element.nodeType === 1);
        };

        if (typeof container === 'string' || container instanceof String) {
            container = document.getElementById(container);
        } else if (isDomElement(container)) {
            containerElementId = container.id;
        }

        if (!id || !signedUrl) {
            throw new Error('Parameters id and signedUrl are mandatory.');
        }

        if (!isDomElement(container)) {
            throw new Error('DOM element with ID "' + containerElementId +
                '" is required to render the widget "' + id + '".');
        }

        attrs = attrs || {};
        attrs.id = id.replace(/\s/g, '-');
        attrs.name = attrs.id;
        attrs.src = signedUrl + '&frameId=' + encodeURIComponent(attrs.id);

        /**
         * The RPC code requires that the 'name' attribute be properly set on the
         * iframe.  However, setting the 'name' property on the iframe object
         * returned from 'createElement('iframe')' doesn't work on IE --
         * 'window.name' returns null for the code within th e iframe.  The
         * workaround is to set the 'innerHTML' of a span to the iframe's HTML code,
         * with 'name' and other attributes properly set.
         */
        attrs.name = attrs.id;
        for (attr in attrs) {
            if (attrs.hasOwnProperty(attr)) {
                iframeText += ' ' + attr + '="' + attrs[attr] + '"';
            }
        }

        iframeText += '></iframe>';
        container.innerHTML = iframeText;

        return container.children[0];
    };
}(appstore));

/* start of security/security.container.js */
(function(appstore) {
    'use strict';

    var debug = false;
    var getOrigin = function (url) {
        var host, slashPos, protocol, portStr, portPos, port;

        if (!url) {
            return '';
        }
        url = url.toLowerCase();
        if (url.indexOf('//') === 0) {
            url = window.location.protocol + url;
        }

        if (url.indexOf('://') === -1) {
            // Assumed to be schemaless. Default to current protocol.
            url = window.location.protocol + '//' + url;
        }

        // At this point we guarantee that '://' is in the URL and defines
        // current protocol. Skip past this to search for host:port.
        host = url.substring(url.indexOf('://') + 3);

        // Find the first slash char, delimiting the host:port.
        slashPos = host.indexOf('/');
        if (slashPos !== -1) {
            host = host.substring(0, slashPos);
        }

        protocol = url.substring(0, url.indexOf('://'));

        // Use port only if it's not default for the protocol.
        portStr = '';
        portPos = host.indexOf(':');
        if (portPos !== -1) {
            port = host.substring(portPos + 1);
            host = host.substring(0, portPos);
            if ((protocol === 'http' && port !== '80') ||
                (protocol === 'https' && port !== '443')) {
                portStr = ':' + port;
            }
        }

        // Return <protocol>://<host>[<port>]
        return protocol + '://' + host + portStr;
    };
    var receiveSynMessage = function (event) {
        // TODO: investigate whether we really need this check
        if (getOrigin(event.origin) !== getOrigin('<%%=viewerUrl%%>')) {
            return;
        }

        if (!event.data || typeof event.data !== 'string' || event.data.indexOf('appstore:') !== 0) {
            return;
        }

        if (debug) {
            appstore.console.log('syn received from', event.origin, 'at', (new Date()).getTime());
        }

        var message = {
            secret: event.data,
            URL: document.URL,
            eventsContext: appstore.events.getContext()
        };
        // IE doesn't work well with complex objects being sent,
        // so build a string instead of sending plain js objects
        if (debug) {
            appstore.console.log('send ack to', event.origin, 'at', (new Date()).getTime());
        }

        event.source.postMessage(JSON.stringify(message), event.origin);
    };

    appstore.util.receiveMessage(receiveSynMessage);
}(appstore));
/* end of security/security.common.js */
(function(appstore) {
    'use strict';

    var parentDomain = appstore.util.getURLParameter('parent');
    var tokenBodyData = appstore.util.getTokenData();
    var allowedDomains = tokenBodyData.aud.domains || [];
    var originalRunOnLoadHandlers = appstore.util.runOnLoadHandlers;
    var countOfReceivedSecurityMessages = 0;
    var isChecked = false;
    var debug = false;
    var isOnLoadHandlersFired = false;
    // direct references used here in order to check nativity
    var receiveMessage = window.addEventListener || window.attachEvent;
    var secret;
    var blockApp = function () {
        /* jshint evil: true */
        document.write('<style>body{color: #F4F4F4;background-color: #2C2C2C;}</style><blockquote><h2>' +
            'Access to the widget has been forbidden</h2>' +
            '<p>We apologise for the inconvenience. Widget is tried to be used in a wrong domain. ' +
            'Access to the widget has been forbidden. ' +
            'Please <a href="mailto:%%support.email.address%%" style="cursor: pointer;color: #F4F4F4;">contact</a>' +
            ' support team if necessary.</p></blockquote>');
        /* jshint evil: false */

        document.close();

        if (window.stop !== undefined) {
            window.stop();
        } else if (document.execCommand !== undefined) {
            document.execCommand('Stop', false);
        }

        //Standard iframe's onload event doesn't occur when whole content of iframe was replaced.
        //So we use 'postMessage' here to allow parent window to determine that iframe has been loaded.
        window.parent.postMessage(JSON.stringify({loadedFrame: window.name}), '*');
    };
    var appstoreSecurityValidate = function () {
        if (!isChecked) {
            blockApp();
        }
    };
    var tryParseJSON = function (str) {
        if (!str) {
            return null;
        }

        try {
            return JSON.parse(str);
        } catch (e) {
            return null;
        }
    };
    var normalizeFunctionString = function (functionString) {
        return functionString.replace(/(function )(\w+)(\()/, '$1$3').replace('\n', '');
    };
    var normalizeUrl = function (url) {
        if (!url) {
            return '';
        }

        url = url.toLowerCase();
        if (url.indexOf('//') === 0) {
            url = window.location.protocol + url;
        }

        if (url.indexOf('://') === -1) {
            // Assumed to be schemaless. Default to current protocol.
            url = window.location.protocol + '//' + url;
        }

        // At this point we guarantee that '://' is in the URL and defines
        // current protocol. Skip past this to search for host:port.
        var host = url.substring(url.indexOf('://') + 3);
        var path = '';

        // Find the first slash char, delimiting the host:port.
        var slashPos = host.indexOf('/');
        if (slashPos !== -1) {
            path = host.substring(slashPos);
            host = host.substring(0, slashPos);
        }

        // remove query params
        var questionPos = path.indexOf('?');
        if (questionPos !== -1) {
            path = path.substring(0, questionPos);
        }

        if (path.length === 0 || path[path.length - 1] !== '/') {
            path = path + '/';
        }

        var protocol = url.substring(0, url.indexOf('://'));
        // Use port only if it's not default for the protocol.
        var portStr = '';
        var portPos = host.indexOf(':');
        if (portPos !== -1) {
            var port = host.substring(portPos + 1);
            host = host.substring(0, portPos);
            if ((protocol === 'http' && port !== '80') ||
                (protocol === 'https' && port !== '443')) {
                portStr = ':' + port;
            }
        }

        // Return <protocol>://<host>[<port>]/<path>
        return protocol + '://' + host + portStr + path;
    };
    var functionsEqual = function (func, anonymousToString) {
        var func1 = normalizeFunctionString(anonymousToString.apply(func)),
            func2 = normalizeFunctionString(anonymousToString.toString());

        return func1 === func2;
    };
    var isGenuineNative = function (func) {
        var templateFunction = function () {};
        var anonymousToString = templateFunction.toString;
        return (((typeof func) === 'object') || functionsEqual(func, anonymousToString));
    };
    var isInDomain = function (expectedDomain, url) {
        var normalizedExpectedDomain = normalizeUrl(expectedDomain);
        var normalizedUrl = normalizeUrl(url);

        return normalizedUrl.indexOf(normalizedExpectedDomain) === 0;
    };
    var startUpWidget = function () {
        originalRunOnLoadHandlers();
    };
    var receiveAckMessage = function (event) {
        var receivedMessage = tryParseJSON(event.data);

        if (!receivedMessage ||
            !receivedMessage.secret ||
            receivedMessage.secret.indexOf('appstore:') !== 0 ||
            countOfReceivedSecurityMessages > 0) {
            return;
        }

        if (debug) {
            appstore.util.console.log('ack received from', event.origin, 'at', (new Date()).getTime());
        }

        countOfReceivedSecurityMessages++;

        var areGenuineNative = isGenuineNative(receiveMessage) &&
            isGenuineNative(window.parent.postMessage) && isGenuineNative(setTimeout);

        isChecked = isInDomain(parentDomain, receivedMessage.URL) &&
            (receivedMessage.secret === secret) && areGenuineNative;

        if (isChecked) {
            /* Executes original onLoadHandlers if mocked gadgets.util.runOnLoadHandlers was called.
             Otherwise rollbacks gadgets.util.runOnLoadHandlers to its original state and
             when it will be called it will do what it suppose to do.
             */

            if (receivedMessage.eventsContext) {
                appstore.events.initialContext = receivedMessage.eventsContext;
            }

            if (isOnLoadHandlersFired) {
                startUpWidget();
            } else {
                appstore.util.runOnLoadHandlers = function () {
                    startUpWidget();
                };
            }
        } else {
            blockApp();
        }
    };
    var performHandshake = function (timeout) {
        if (!window.addEventListener) {
            receiveMessage('onmessage', receiveAckMessage);
        } else {
            receiveMessage('message', receiveAckMessage, false);
        }

        // Use simple security for only browsers supporting postMessage.
        appstore.util.runOnLoadHandlers = function() {
            /* Indicates that gadgets.util.runOnLoadHandlers function was called
             earlier than parent send ack message. When ack message will be received
             (see: receiveMessage) and all security checks are valid then original
             handlers will be called.
             */
            isOnLoadHandlersFired = true;
            // We decided that this timeout would be enough to receive ack message.
            setTimeout(appstoreSecurityValidate, timeout);
        };

        //we expect that parent window contains container security api
        try {
            if (debug) {
                appstore.util.console.log('send syn to', parentDomain, 'at', (new Date()).getTime());
            }

            secret = 'appstore:' + (new Date().getTime() + Math.random()).toString();
            window.parent.postMessage(secret, parentDomain);
        } catch (e) {
            blockApp();
        }
    };

    var isDomainInListOfAllowedDomains = function(){
        var i;
        for(i = 0; i < allowedDomains.length; i++){
            if(isInDomain(parentDomain, allowedDomains[i])){
                return true;
            }
        }

        return false;
    };

    if (!isDomainInListOfAllowedDomains() || !isInDomain(parentDomain, document.referrer) ) {
        setTimeout(function () {
            blockApp();
        }, 0);
    } else {
        performHandshake(15000);
    }
}(appstore));

(function (appstore) {
    'use strict';

    appstore.util.registerOnLoadHandler(function () {
        var resizeCallbacks = [];

        appstore.resize = function (callback) {
            resizeCallbacks.push(callback);
        };

        var attachEvent = function (elem, event, fn) {
            if (elem.addEventListener) {
                elem.addEventListener(event, fn, false);
            } else {
                elem.attachEvent('on' + event, function () {
                    // set the this pointer same as addEventListener when fn is called
                    return(fn.call(elem, window.event));
                });
            }
        };

        var getViewPort = function () {
            var viewPortWidth;
            var viewPortHeight;

            // the more standards compliant browsers
            // (mozilla/netscape/opera/IE9) use window.innerWidth and window.innerHeight
            if (window.innerWidth !== undefined) {
                viewPortWidth = window.innerWidth;
                viewPortHeight = window.innerHeight;
            }

            // IE8 in standards compliant mode (i.e. with a valid doctype as the first line in the document)
            else if (document.documentElement !== undefined && document.documentElement.clientWidth !== undefined) {
                viewPortWidth = document.documentElement.clientWidth;
                viewPortHeight = document.documentElement.clientHeight;
            }
            // older versions of IE
            else {
                viewPortWidth = document.body.clientWidth;
                viewPortHeight = document.body.clientHeight;
            }
            return  { width: viewPortWidth, height: viewPortHeight};
        };

        var resizeHandler = (function () {
            var lastWidth,
                lastHeight;

            var width = null,
                height = null;

            var triggerEvent = false;
            var isPortal = false;

            return function () {
                var i;
                var windowSize = getViewPort();
                var widthInt,
                    heightInt;

                try {
                    // to access top window (works only on isPortal)
                    width = window.frameElement.style.width || window.frameElement.getAttribute('width') || '100%';
                    isPortal = true;
                } catch (e) {
                    // eat exception (not a isPortal)
                    width = windowSize.width;
                    isPortal = false;
                }
                height = windowSize.height;

                if (isPortal) {
                    if (width.indexOf('%') === -1) {
                        widthInt = parseInt(width);
                        if (lastWidth !== widthInt) {
                            // in order to catch next resize event
                            // set body width to window width - 1px
                            // in order to issue in mobile safari with frame resize
                            document.body.style.width = widthInt - 1 + 'px';
                        }
                    }
                    else {
                        widthInt = parseInt(windowSize.width);
                    }
                } else {
                    widthInt = parseInt(width);
                }
                heightInt = parseInt(height);
                if (lastWidth !== widthInt || lastHeight !== heightInt) {
                    lastWidth = widthInt;
                    lastHeight = heightInt;
                    triggerEvent = true;
                }
                if (triggerEvent) {
                    if (resizeCallbacks.length > 0) {
                        for (i = 0; i < resizeCallbacks.length; i++) {
                            resizeCallbacks[i](widthInt, heightInt);
                            triggerEvent = false;
                        }
                    }
                }
            };
        }());

        attachEvent(window, 'resize', resizeHandler);
    });
}(appstore));




/*
* depends on: appstore.util
* */
(function (appstore) {
    'use strict';
    var onLoadFired = false,
        readyHandlers = [];

    appstore.apiVersion = 'widget';

    appstore.ready = function (callback) {
        if (!onLoadFired) {
            readyHandlers.push(callback);
        } else {
            callback(appstore.events.initialContext);
        }
    };
    appstore.cancelReady = function () {
       readyHandlers.length = 0;
    };

    appstore.util.registerOnLoadHandler(function () {
        var i;

        for (i = 0; i < readyHandlers.length; i++) {
            readyHandlers[i](appstore.events.initialContext);
        }

        onLoadFired = true;
    });
}(appstore));

