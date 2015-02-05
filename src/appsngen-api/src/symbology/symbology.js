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