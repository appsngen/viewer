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
