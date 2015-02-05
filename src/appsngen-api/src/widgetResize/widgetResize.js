(function (appstore) {
    'use strict';

    appstore.util.registerOnLoadHandler(function () {
        var resizeCallbacks = [];

        appstore.resize = function (callback) {
            resizeCallbacks.push(callback);
        };

        var attachEvent = function (elem, event, fn) {
            if (elem.addEventListener) {
                elem.addEventListener(event, fn, false);
            } else {
                elem.attachEvent('on' + event, function () {
                    // set the this pointer same as addEventListener when fn is called
                    return(fn.call(elem, window.event));
                });
            }
        };

        var getViewPort = function () {
            var viewPortWidth;
            var viewPortHeight;

            // the more standards compliant browsers
            // (mozilla/netscape/opera/IE9) use window.innerWidth and window.innerHeight
            if (window.innerWidth !== undefined) {
                viewPortWidth = window.innerWidth;
                viewPortHeight = window.innerHeight;
            }

            // IE8 in standards compliant mode (i.e. with a valid doctype as the first line in the document)
            else if (document.documentElement !== undefined && document.documentElement.clientWidth !== undefined) {
                viewPortWidth = document.documentElement.clientWidth;
                viewPortHeight = document.documentElement.clientHeight;
            }
            // older versions of IE
            else {
                viewPortWidth = document.body.clientWidth;
                viewPortHeight = document.body.clientHeight;
            }
            return  { width: viewPortWidth, height: viewPortHeight};
        };

        var resizeHandler = (function () {
            var lastWidth,
                lastHeight;

            var width = null,
                height = null;

            var triggerEvent = false;
            var isPortal = false;

            return function () {
                var i;
                var windowSize = getViewPort();
                var widthInt,
                    heightInt;

                try {
                    // to access top window (works only on isPortal)
                    width = window.frameElement.style.width || window.frameElement.getAttribute('width') || '100%';
                    isPortal = true;
                } catch (e) {
                    // eat exception (not a isPortal)
                    width = windowSize.width;
                    isPortal = false;
                }
                height = windowSize.height;

                if (isPortal) {
                    if (width.indexOf('%') === -1) {
                        widthInt = parseInt(width);
                        if (lastWidth !== widthInt) {
                            // in order to catch next resize event
                            // set body width to window width - 1px
                            // in order to issue in mobile safari with frame resize
                            document.body.style.width = widthInt - 1 + 'px';
                        }
                    }
                    else {
                        widthInt = parseInt(windowSize.width);
                    }
                } else {
                    widthInt = parseInt(width);
                }
                heightInt = parseInt(height);
                if (lastWidth !== widthInt || lastHeight !== heightInt) {
                    lastWidth = widthInt;
                    lastHeight = heightInt;
                    triggerEvent = true;
                }
                if (triggerEvent) {
                    if (resizeCallbacks.length > 0) {
                        for (i = 0; i < resizeCallbacks.length; i++) {
                            resizeCallbacks[i](widthInt, heightInt);
                            triggerEvent = false;
                        }
                    }
                }
            };
        }());

        attachEvent(window, 'resize', resizeHandler);
    });
}(appstore));



