/*
 * depends on: appstore.util, appstore.config
 * */
(function (appstore) {
    'use strict';

    appstore.util.registerOnLoadHandler(function () {
        var metadata = appstore.config.metadata || {};
        var message = JSON.stringify({
            type: 'metadataReadyCall',
            frameId: appstore.util.getURLParameter('frameId'),
            metadata: metadata
        });

        var parentUrl = appstore.util.getURLParameter('parent');

        appstore.util.postMessage(message, parentUrl, window.parent);
    });
}(appstore));