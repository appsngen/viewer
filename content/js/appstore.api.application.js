/* global initLibraryConfig */
(function (window) {
    'use strict';
    var noop = function () {},
        localStorageObject = {},
        appstore = window.appstore || {},
        gadgets = window.gadgets,
        loadHandlers = [];

    appstore.util = {
        noop: noop,
        unescapeString: function (str) {
            return gadgets.util.unescapeString(str);
        },
        registerOnLoadHandler: function (handler) {
            loadHandlers.push(handler);
        },
        runOnLoadHandlers: function () {
            var i;

            for (i = 0; i < loadHandlers.length; i++) {
                loadHandlers[i]();
            }
        },
        initConfig: function () {
            /* Calls initialization of library - gadgets.config.init(..)
             See: RenderingGadgetRewriter.java injectFeatureLibraries
             */
            return initLibraryConfig();
        },
        getURLParameter: function (name) {
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
        localStorage: window.localStorage ||  {
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
        }
    };

    window.appstore = appstore;
}(window));
/* global gadgets, shindig */
(function (appstore, gadgets, shindig) {
    'use strict';

    appstore.config = {
        appId: appstore.util.getURLParameter('application'),
        userId: appstore.util.getURLParameter('userId'),
        organizationId: appstore.util.getURLParameter('clientId'),
        frameId: appstore.util.getURLParameter('frameId') || window.name || '.'
    };

    appstore.util.registerOnLoadHandler(function () {
        var featureName = gadgets.util.hasFeature('appstore.api') ? 'appstore.api' : 'ie7';

        appstore.config.dataSourceProxyUrl = gadgets.config.get(featureName).datasourceProxyUrl;
        appstore.config.datasourceActivProxyUrl = gadgets.config.get(featureName).activProxyWebSocketUrl;
        appstore.config.resourceUrl = gadgets.config.get(featureName).resourceUrl;
        appstore.config.dataSourceProxyToken = shindig.auth.getSecurityToken();
        appstore.config.unsupportedBrowserUrl = gadgets.config.get(featureName).unsupportedBrowserUrl;
        appstore.config.metadata = gadgets.config.get('core.util')['appstore.events'];
        appstore.config.prefs = new gadgets.Prefs();
    });
}(appstore, gadgets, shindig));

(function (appstore) {
    'use strict';

    var debug = false;

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
                resolve : function (context, args) {
                    if (!rejected && !resolved) {
                        notifySubscribers(successCallbacks, context, args);
                    }

                    resolved = true;
                },
                reject : function (context, args) {
                    if (!rejected && !resolved) {
                        notifySubscribers(errorCallbacks, context, args);
                    }

                    rejected = true;
                },
                promise : {
                    url: '',
                    success : function (handler) {
                        if (!rejected) {
                            if (resolved) {
                                handler.apply(storedContext, storedArgs);
                            } else {
                                successCallbacks.push(handler);
                            }
                        }

                        return this;
                    },
                    error : function (handler) {
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
        var stringifyParams = function (request) {
            var params = [], url, param;

            for (param in request) {
                if (request.hasOwnProperty(param)){
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
        var createRequestUri = function (request) {
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
        var createAuthorizationHeader = function () {
            var token = appstore.config.dataSourceProxyToken;
            var tokenType = 'Bearer';

            return tokenType + ' ' + token;
        };
        var resolveResponse = function (deferred, response, statusCode, dataSourceId) {
            var data = deferred.promise.parseResponse(response, statusCode);

            if (deferred.promise.isSuccessful(response, statusCode)) {
                if (debug) {
                    appstore.util.console.log(dataSourceId, 'response: ', data, statusCode);
                }

                deferred.resolve(null, [data, statusCode]);
            } else {
                if (debug) {
                    appstore.util.console.error(dataSourceId, 'response: ', data, statusCode);
                }

                deferred.reject(null, [data, statusCode]);
            }
        };
        var defaultIsSuccessful = function (response, statusCode) {
            return statusCode === 200;
        };
        var defaultParseResponse = function (response) {
            return JSON.parse(response);
        };
        var ajax = function (request) {
            var uri = createRequestUri(request),
                endPoint = appstore.config.dataSourceProxyUrl,
                authorizationHeader = createAuthorizationHeader(),
                deferred = createDeferred(),
                xhr,
                requestUri = endPoint + '/data-sources/' + uri;

            request.headers = request.headers || {};

            request.headers['Authorization'] = authorizationHeader;
            request.headers['DS-Viewer'] = appstore.config.userId;
            request.headers['DS-Owner'] = appstore.config.organizationId;

            deferred.promise.isSuccessful = defaultIsSuccessful;
            deferred.promise.parseResponse = defaultParseResponse;

            if (debug) {
                appstore.util.console.log(request.dataSourceId, 'request: ', request, { url : requestUri });
            }

            xhr = makeRequest(requestUri, request, function (response, statusCode) {
                resolveResponse(deferred, response, statusCode, request.dataSourceId);
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
    } ());
}(appstore));
(function (appstore) {
    'use strict';

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
                    socketInstance = new WebSocket(url + sign + 'accessToken=' + headers.Authorization);
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
}(appstore));
/* start of prefs/prefs.js */
/**
 * Provides possibilities to get the set of user preferences those can be redefined with url parameters.
 * @class appstore.prefs
 */
(function (appstore){
    'use strict';

    //TODO: add prefs converting to real type.
    appstore.prefs = (function () {
        var prefs;

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
                    if (possibleValues[i] === appstore.util.unescapeString(value)) {
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

        appstore.util.registerOnLoadHandler(function() {
            prefs = getDefaultPrefs();
            extendWithParamsPrefs(prefs);
        });

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
}(appstore));
(function (appstore) {
    'use strict';

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
            var serializedData = localStorage.getItem(cacheKey);
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
                localStorage.setItem(cacheKey, serializedData);
            } catch (e1) {
                // something wrong
                // probably storage size quota has been exceeded
                // remove expired items
                removeExpired(data);
                // try to store data once again
                serializedData = JSON.stringify(data);
                try {
                    localStorage.setItem(cacheKey, serializedData);
                } catch (e2) {
                    // if we have not enough space - clear all stored data
                    localStorage.removeItem(cacheKey);
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
                        }).error(function (response) {
                            var error = new Error(appstore.util.format('data source answered with the error: "{0}"',
                                response.message));
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
}(appstore));
(function (appstore) {
    'use strict';

    // TODO: move it to result html after get rid of shindig
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
}(appstore));
(function (appstore) {
    'use strict';

    /**
     * @fileoverview subscribe/publish mechanism (application part)
     * subscribe/publish mechanism (application part)
     * @class appstore.events
     */
    appstore.events = (function () {
        /** The origin of the container window. Default value is the same origin as application*/
        var parentURL = appstore.util.getURLParameter('parent');

        if (parentURL) {
            parentURL = parentURL.toLowerCase();
        } else {
            parentURL = location.href;
        }

        var frameId = appstore.config.frameId;

        /** Current app subscriptions. */
        var subscriptions = {};

        /** Parses message and pass only event messages from the apps. */
        var parseMessage = function (event) {
            var message;

            // Check the origin to be the parent URL if it is specified because it works only for postMessage.
            if (event.origin && parentURL.lastIndexOf(event.origin, 0) !== 0) {
                return undefined;
            }

            // Try parse.
            try {
                message = JSON.parse(event.data);
            } catch (e) {
                return undefined;
            }

            // Check the message to be event message with the 'publish' type.
            if (message  && message.type === 'publish' && message.sender && message.data) {
                return message;
            }

            return undefined;
        };
        /**
         * Sends event message to the parent window.
         * */
        var sendMessage = function (type, data) {
            var message = { type : type, sender : frameId, data : data };

            appstore.util.postMessage(JSON.stringify(message), parentURL, window.parent);
        };

        // Handle messages from the container
        appstore.util.receiveMessage(function (event) {
            var message = parseMessage(event), handler,
                logFormat, logMessage;

            if (!message) {
                return;
            }

            // If the message is event message and from the container
            // Check the app subscriptions and fire event if the app subscribed to the channel from the message
            // and the sender is not the app itself.
            handler = subscriptions[message.data.channel];

            if (handler && message.sender !== frameId) {
                if (appstore.events.debug) {
                    logFormat = 'Event received. receiver: "{0}", sender: "{1}", channel: "{2}", data:';
                    logMessage = appstore.util.format(logFormat, frameId, message.sender, message.data.channel);
                    appstore.util.console.log(logMessage, message.data.data);
                }

                handler(message.data.channel, message.data.data, message.sender);
            }
        });

        return /** @scope appstore.events */ {
            /**
             * Subscribes the app to the channel.
             * @method subscribe
             * @param {String} channel Channel.
             * @param {Function} handler Event handler.
             * @return {Object} Chain.
             * */
            subscribe : function (channel, handler) {
                // Save subscription on the app side
                subscriptions[channel] = handler;

                // Notify the container about new subscription.
                sendMessage('subscribe', { channel : channel });

                return this;
            },

            /**
             * Unsubscribes the app from the channel.
             * @method unsubscribe
             * @param {String} channel Channel.
             * @return {Object} Chain.
             * */
            unsubscribe : function (channel) {
                // Delete subscription if exist and notify the container.
                if (subscriptions[channel]) {
                    delete subscriptions[channel];
                    sendMessage('unsubscribe', { channel : channel });
                }

                return this;
            },

            /**
             * Publishes the data to the channel.
             * @method publish
             * @param {String} channel Channel.
             * @param {Object} data Data.
             * @param {Boolean} propagate Shows whether to propagate message above the container. Default is true.
             * @return {Object} Chain.
             * */
            publish : function (channel, data, propagate) {
                var logFormat, logMessage;
                // Set 'propagate' as true by default.
                propagate = propagate === undefined ? true : !!propagate;

                if (appstore.events.debug) {
                    logFormat = 'Event send. sender: "{0}", channel: "{1}", data:';
                    logMessage = appstore.util.format(logFormat, frameId, channel);
                    appstore.util.console.log(logMessage, data);
                }

                // Notify the container about new event message.
                sendMessage('publish', { channel : channel, data : data, propagate : propagate });

                return this;
            },
            /**
             * Specify whether to log events to the console.
             * @property debug
             * */
            debug : false
        };
    }());
}(appstore));

(function (appstore) {
    'use strict';

    appstore.util.registerOnLoadHandler(function () {
        var metadata = appstore.config.metadata;

        appstore.events.publish('_metadata', metadata);
    });
}(appstore));
/**
 * @fileoverview
 * Represent possibility to adjust height of application to the provided value or application content height.
 * Uses the Shindig RPC mechanism to send value to the parent window.
 * Note value is sent twice for IE
 * first time - document.body.offsetHeight,
 * second time - document.documentElement.scrollHeight.
 */
(function (appstore) {
    'use strict';

    var isIE = navigator.userAgent.search(/MSIE/) > 0;

    appstore.adjustHeight = (function () {
        var sendHeight = function (height, isFirst) {
            appstore.events.publish('_resizeApp',  { height : height, isFirst : isFirst }, false);
        };

        var completeHandler;

        // back handler for height adjusting confirmation.
        appstore.events.subscribe('_resizeApp', function (channel, data) {
            if (data.frameId !== appstore.config.frameId) {
                return;
            }

            if (data.isFirst && isIE) {
                sendHeight(document.documentElement.scrollHeight, false);
            } else if (typeof completeHandler === 'function') {
                completeHandler();
            }
        });

        return function (height) {
            // In case height is not specified, document height will be used to adjust.
            if (isNaN(height)) {
                height = isIE ? document.body.offsetHeight : document.documentElement.offsetHeight;
                sendHeight(height, true);
            } else {
                sendHeight(height, false);
            }

            return {
                complete: function (callback) {
                    completeHandler = callback;
                }
            };
        };
    }());
}(appstore));

(function (appstore) {
    'use strict';

    appstore.util.registerOnLoadHandler(function() {
        appstore.resourceUrl = ''; // only for new viewer (empty base url)
    });
}(appstore));
(function (appstore) {
    'use strict';

    var onLoadFired = false,
        readyHandlers = [];

    appstore.util.registerOnLoadHandler(function () {
        var i;

        for (i = 0; i < readyHandlers.length; i++) {
            readyHandlers[i](appstore.events.initialContext);
        }

        onLoadFired = true;
    });

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
}(appstore));


(function (appstore) {
    'use strict';

    appstore.util.registerOnLoadHandler(function () {
        /* Chrome|Android|OmniWeb|Safari|iCab|Konqueror|Firefox|Camino|Netscape|IE|Mozilla */
        var supportedBrowsers = appstore.supportedBrowsers || [];

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
                {
                    string: navigator.userAgent,
                    subString: 'MSIE',
                    identity: 'IE',
                    versionSearch: 'MSIE'
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
/* global gadgets */
(function(appstore, gadgets) {
    'use strict';

    var parentDomain = appstore.util.getURLParameter('parent');
    var originalRunOnLoadHandlers = gadgets.util.runOnLoadHandlers;
    var countOfReceivedSecurityMessages = 0;
    var isChecked = false;
    var debug = false;
    var isOnLoadHandlersFired = false;
    var messaging = window.addEventListener || window.attachEvent;
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
        appstore.util.initConfig();
        appstore.util.runOnLoadHandlers();
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

        var areGenuineNative = isGenuineNative(messaging) &&
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
                gadgets.util.runOnLoadHandlers = function () {
                    startUpWidget();
                };
            }
        } else {
            blockApp();
        }
    };

    if (!window.addEventListener) {
        messaging('onmessage', receiveAckMessage);
    } else {
        messaging('message', receiveAckMessage, false);
    }

    // Use simple security for only browsers supporting postMessage.
    if (window.postMessage) {
        gadgets.util.runOnLoadHandlers = function() {
            /* Indicates that gadgets.util.runOnLoadHandlers function was called
             earlier than parent send ack message. When ack message will be received
             (see: receiveMessage) and all security checks are valid then original
             handlers will be called.
             */
            isOnLoadHandlersFired = true;
            // We decided that this timeout would be enough to receive ack message.
            setTimeout(appstoreSecurityValidate, 1000);
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
    } else {
        gadgets.util.runOnLoadHandlers = function () {
            startUpWidget();
        };
    }
}(appstore, gadgets));
