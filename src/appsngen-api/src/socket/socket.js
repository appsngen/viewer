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