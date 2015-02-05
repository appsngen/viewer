(function (window) {
    'use strict';

    window.dummyEventHandler = null;
    window.postMessageListeners = [];
    window.addEventListener = function (type, callBack) {
        // appsngen.events registers this callback first
        if (type === 'message') {
            window.postMessageListeners.push(callBack);
        }
        if (type === 'resize' && window.dummyResizeEventHandler === null) {
            window.dummyResizeEventHandler = callBack;
        }
    };
}(window));