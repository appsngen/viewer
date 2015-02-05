/*
* depends on: appstore.util
* */
(function (appstore) {
    'use strict';
    var onLoadFired = false,
        readyHandlers = [];

    appstore.apiVersion = 'widget';

    appstore.ready = function (callback) {
        if (!onLoadFired) {
            readyHandlers.push(callback);
        } else {
            callback(appstore.events.initialContext);
        }
    };
    appstore.cancelReady = function () {
       readyHandlers.length = 0;
    };

    appstore.util.registerOnLoadHandler(function () {
        var i;

        for (i = 0; i < readyHandlers.length; i++) {
            readyHandlers[i](appstore.events.initialContext);
        }

        onLoadFired = true;
    });
}(appstore));

