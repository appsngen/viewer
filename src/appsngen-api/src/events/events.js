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