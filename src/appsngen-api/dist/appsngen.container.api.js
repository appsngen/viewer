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
 * depends on: appstore.util, appstore.events
 * */
(function (appstore) {
    'use strict';

    appstore.events.metadata = (function () {
        var metadata = {} , onReady = appstore.util.noop;

        // Listen the '_metadata' channel.
        appstore.util.receiveMessage(function (event) {
            var message;

            try {
                message = JSON.parse(event.data);
            } catch (ignore) {
            }

            if (message && message.type === 'metadataReadyCall' && message.frameId && message.metadata) {
                metadata[message.frameId] = message.metadata;
                onReady(message.frameId, message.metadata);
            }
        });

        return /** @scope appstore.events.metadata */ {
            /**
             * Register callback to be called when metadata is received.
             * @param {function(appId, metadata)} callback Callback.
             * */
            ready: function (callback) {
                var frameId, onReadyForFrameId;
                onReady = callback;
                onReadyForFrameId = function (frameId) {
                    return function () {
                        onReady(frameId, metadata[frameId]);
                    };
                };

                // Notify about already received metadata.
                for (frameId in metadata) {
                    if (metadata.hasOwnProperty(frameId)) {
                        setTimeout(onReadyForFrameId(frameId), 0);
                    }
                }
            },
            /**
             * Gets events metadata for the app.
             * @param {String} frameId Id of the app to get events metadata.
             * If the frameId is missed metadata for all the created apps will be returned.
             * @return {Object|undefined} events metadata.
             * */
            get: function (frameId) {
                var result = frameId ? metadata[frameId] : metadata;

                if (!result) {
                    return undefined;
                }

                return JSON.parse(JSON.stringify(result));
            }
        };
    }());
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
(function (appstore) {
    'use strict';
    appstore.apiVersion = 'container';

    if (appstore && appstore.ready) {
        appstore.ready();
    }
}(appstore));
