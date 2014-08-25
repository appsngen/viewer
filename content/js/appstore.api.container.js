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
(function (appstore) {
    'use strict';

    appstore = appstore || {};
    appstore.config = {
        appId: appstore.util.getURLParameter('application'),
        userId: appstore.util.getURLParameter('userId'),
        organizationId: appstore.util.getURLParameter('clientId'),
        frameId: appstore.util.getURLParameter('frameId') || window.name || '..'
    };
}(appstore));

(function (appstore) {
    'use strict';

    /**
     * @fileoverview subscribe/publish mechanism (container part).
     */
    appstore.events = (function () {
        /** This id will be specified as sender. */
        var frameId = appstore.config.frameId;

        /** The origin of the container window. */
        var parentURL = appstore.util.getURLParameter('parent');
        if (parentURL) {
            parentURL = parentURL.toLowerCase();
        }

        /**
         * Contains set of channels with app ids subscribed to them.
         * It is necessary to forward messages between apps.
         * Thus the container is a kind of a router.
         * */
        var appsSubscriptions = {};

        /** The container subscriptions. */
        var conteinerSubscriptions = {};

        /** Contains last data for every channel. */
        // TODO: add TTL to fix possible bugs with ancient events
        var context = [];
        var contextStorageKey = 'appstore-events-context';
        var internalEvents = {
            '_metadata': true,
            '_resizeApp': true
        };

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

            return { type: 'unsupported'};
        };

        /** Forwards message to the top in case of this container is an iframe. */
        var sendMessageToTop = function (message) {

            // Clone message
            var newMessage = JSON.parse(JSON.stringify(message));

            // Replace the sender property to this container.
            newMessage.sender = frameId;

            // Send message only if this window is iframe.
            if (window !== window.top && parentURL) {
                window.parent.postMessage(JSON.stringify(newMessage), parentURL);
            }
        };

        /** Saves subscribed frameId and forwards subscribe message to the top. */
        var resolveSubscribeMessage = function (message) {
            // Save the subscribed apps ids.
            appsSubscriptions[message.data.channel] = appsSubscriptions[message.data.channel] || {};
            appsSubscriptions[message.data.channel][message.sender] = true;

            sendMessageToTop(message);
        };

        /** Removes the subscriber frameId and forwards unsubscribe message to the top. */
        var resolveUnsubscribeMessage = function (message) {
            if (appsSubscriptions[message.data.channel]) {
                delete appsSubscriptions[message.data.channel][message.sender];
            }

            sendMessageToTop(message);
        };

        var notifySubscribers = function (targetSubscribers, message) {
            var subscriber, targetIframe, jsonMessage;

            for (subscriber in targetSubscribers) {
                if (targetSubscribers.hasOwnProperty(subscriber) && subscriber !== message.sender) {
                    targetIframe = document.getElementById(subscriber);
                    if (targetIframe) {
                        jsonMessage = JSON.stringify(message);
                        appstore.util.postMessage(jsonMessage, targetIframe.src, targetIframe.contentWindow);
                    }
                }
            }
        };

        /** Sends publish event from the message to the all subscribed apps. */
        var sendMessageToApps = function (message) {
            var targetSubscribers;

            // Get appIds that subscribed to the channel
            targetSubscribers = appsSubscriptions[message.data.channel];

            // Send the message to every app that subscribed to the channel except the sender itself.
            if (targetSubscribers) {
                notifySubscribers(targetSubscribers, message);
            }
        };

        /** forward publish message to the apps subscribers and fire event
         * if the container is subscribed to the channel form message. */
        var resolvePublishMessage = function (message, fromTop) {
            var handler, logMessage, messageFormat;

            sendMessageToApps(message);

            // Send message to top only in case of the propagate property is true
            // and the message didn't received from the top itself.
            if (!fromTop && message.data.propagate) {
                sendMessageToTop(message);
            }

            // Save received data.
            if (!internalEvents[message.data.channel]) {
                storeEventToContext(message.data);
            }

            // Check the container subscriptions and fire event
            // if the container subscribed to the channel from the message and sender is not the container itself.
            handler = conteinerSubscriptions[message.data.channel];

            if (handler && message.sender !== frameId) {
                if (appstore.events.debug) {
                    messageFormat = 'Event received. receiver: "{0}", sender: "{1}", channel: "{2}", data:';
                    logMessage = appstore.util.format(messageFormat, frameId, message.sender, message.data.channel);
                    appstore.util.console.log(logMessage, message.data.data);
                }

                handler(message.data.channel, message.data.data, message.sender);
            }
        };

        context = getStoredContext();

        // Handle messages from the apps
        appstore.util.receiveMessage(function (event) {
            var message = parseMessage(event.data);

            if (message.type === 'subscribe') {
                resolveSubscribeMessage(message);
            } else if (message.type === 'publish') {
                resolvePublishMessage(message, event.source === window.parent);
            } else if (message.type === 'unsubscribe') {
                resolveUnsubscribeMessage(message);
            }
        });

        return /** @scope appstore.events */ {
            /**
             * Subscribes the container to the channel.
             * @param {String} channel Channel.
             * @param {Function} handler Event handler.
             * @return {Object} Chain.
             * */
            subscribe: function (channel, handler) {
                // Save subscription on the container side
                conteinerSubscriptions[channel] = handler;

                return this;
            },

            /**
             * Unsubscribes the container from the channel.
             * @param {String} channel Channel.
             * @return {Object} Chain.
             * */
            unsubscribe: function (channel) {
                // Just delete subscription if it exists.
                delete conteinerSubscriptions[channel];

                return this;
            },

            /**
             * Publishes the data to the channel.
             * @param {String} channel Channel.
             * @param {Object} data Data.
             * @param {Boolean} propagate Shows whether to propagate message above the container. Default is true.
             * @return {Object} Chain.
             * */
            publish: function (channel, data, propagate) {
                var logMessage, logFormat;
                // Create event message like just received from an app but with current frameId sender.
                var message = {
                    type: 'publish',
                    sender: frameId,
                    data: {
                        channel: channel,
                        propagate: propagate === undefined ? true : !!propagate
                    }
                };

                if (appstore.events.debug) {
                    logFormat = 'Event send. sender: "{0}", channel: "{1}", data:';
                    logMessage = appstore.util.format(logFormat, frameId, channel);
                    appstore.util.console.log(logMessage, data);
                }

                // Clone the data before 'sending'.
                message.data.data = JSON.parse(JSON.stringify(data));

                // and handle like an async message from an app.
                setTimeout(function () {
                    resolvePublishMessage(message);
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
/* end of events/events.container.js */
(function (appstore) {
    'use strict';

    appstore.events.metadata = (function () {
        var metadata = {} , onReady = appstore.util.noop;

        // Listen the '_metadata' channel.
        appstore.events.subscribe('_metadata', function (channel, data, frameId) {
            if (frameId !== '..') {
                metadata[frameId] = data;
                onReady(frameId, data);
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

    appstore.events.subscribe('_resizeApp', function (channel, data, sender) {
        var element;

        if (dynamicHeightEnabled) {
            element = document.getElementById(sender);

            if (element) {
                element.style.height = data.height + 'px';
            }
        }

        appstore.events.publish('_resizeApp', { frameId: sender, isFirst: data.isFirst }, false);
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
        attrs.id = id.replace(/\s/g, '_');
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
        if (getOrigin(event.origin) !== getOrigin('http://localhost:8889')) {
            return;
        }

        if (!event.data || event.data.indexOf('appstore:') !== 0) {
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
/* end of security/security.container.js */
(function (appstore) {
    'use strict';

    if (appstore && appstore.ready) {
        appstore.ready();
    }
}(appstore));
