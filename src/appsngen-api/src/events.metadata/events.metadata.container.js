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
