(function (window) {
    'use strict';


    window.postMessage = function () { };

    window.dummyEventHandler = null;
    window.dummyResizeEventHandler = null;
    window.postMessageListeners = [];
    window.addEventListener = function (type, callBack) {
        // appstore.events registers this callback first
        if (type === 'message') {
            window.postMessageListeners.push(callBack);
        }
        if (type === 'resize' && window.dummyResizeEventHandler === null) {
            window.dummyResizeEventHandler = callBack;
        }
    };
}(window));