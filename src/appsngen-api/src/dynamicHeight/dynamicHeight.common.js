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