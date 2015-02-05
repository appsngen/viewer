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
