(function(appstore) {
    'use strict';

    var parentDomain = appstore.util.getURLParameter('parent');
    var tokenBodyData = appstore.util.getTokenData();
    var allowedDomains = tokenBodyData.aud.domains || [];
    var originalRunOnLoadHandlers = appstore.util.runOnLoadHandlers;
    var countOfReceivedSecurityMessages = 0;
    var isChecked = false;
    var debug = false;
    var isOnLoadHandlersFired = false;
    // direct references used here in order to check nativity
    var receiveMessage = window.addEventListener || window.attachEvent;
    var secret;
    var blockApp = function () {
        /* jshint evil: true */
        document.write('<style>body{color: #F4F4F4;background-color: #2C2C2C;}</style><blockquote><h2>' +
            'Access to the widget has been forbidden</h2>' +
            '<p>We apologise for the inconvenience. Widget is tried to be used in a wrong domain. ' +
            'Access to the widget has been forbidden. ' +
            'Please <a href="mailto:%%support.email.address%%" style="cursor: pointer;color: #F4F4F4;">contact</a>' +
            ' support team if necessary.</p></blockquote>');
        /* jshint evil: false */

        document.close();

        if (window.stop !== undefined) {
            window.stop();
        } else if (document.execCommand !== undefined) {
            document.execCommand('Stop', false);
        }

        //Standard iframe's onload event doesn't occur when whole content of iframe was replaced.
        //So we use 'postMessage' here to allow parent window to determine that iframe has been loaded.
        window.parent.postMessage(JSON.stringify({loadedFrame: window.name}), '*');
    };
    var appstoreSecurityValidate = function () {
        if (!isChecked) {
            blockApp();
        }
    };
    var tryParseJSON = function (str) {
        if (!str) {
            return null;
        }

        try {
            return JSON.parse(str);
        } catch (e) {
            return null;
        }
    };
    var normalizeFunctionString = function (functionString) {
        return functionString.replace(/(function )(\w+)(\()/, '$1$3').replace('\n', '');
    };
    var normalizeUrl = function (url) {
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
        var host = url.substring(url.indexOf('://') + 3);
        var path = '';

        // Find the first slash char, delimiting the host:port.
        var slashPos = host.indexOf('/');
        if (slashPos !== -1) {
            path = host.substring(slashPos);
            host = host.substring(0, slashPos);
        }

        // remove query params
        var questionPos = path.indexOf('?');
        if (questionPos !== -1) {
            path = path.substring(0, questionPos);
        }

        if (path.length === 0 || path[path.length - 1] !== '/') {
            path = path + '/';
        }

        var protocol = url.substring(0, url.indexOf('://'));
        // Use port only if it's not default for the protocol.
        var portStr = '';
        var portPos = host.indexOf(':');
        if (portPos !== -1) {
            var port = host.substring(portPos + 1);
            host = host.substring(0, portPos);
            if ((protocol === 'http' && port !== '80') ||
                (protocol === 'https' && port !== '443')) {
                portStr = ':' + port;
            }
        }

        // Return <protocol>://<host>[<port>]/<path>
        return protocol + '://' + host + portStr + path;
    };
    var functionsEqual = function (func, anonymousToString) {
        var func1 = normalizeFunctionString(anonymousToString.apply(func)),
            func2 = normalizeFunctionString(anonymousToString.toString());

        return func1 === func2;
    };
    var isGenuineNative = function (func) {
        var templateFunction = function () {};
        var anonymousToString = templateFunction.toString;
        return (((typeof func) === 'object') || functionsEqual(func, anonymousToString));
    };
    var isInDomain = function (expectedDomain, url) {
        var normalizedExpectedDomain = normalizeUrl(expectedDomain);
        var normalizedUrl = normalizeUrl(url);

        return normalizedUrl.indexOf(normalizedExpectedDomain) === 0;
    };
    var startUpWidget = function () {
        originalRunOnLoadHandlers();
    };
    var receiveAckMessage = function (event) {
        var receivedMessage = tryParseJSON(event.data);

        if (!receivedMessage ||
            !receivedMessage.secret ||
            receivedMessage.secret.indexOf('appstore:') !== 0 ||
            countOfReceivedSecurityMessages > 0) {
            return;
        }

        if (debug) {
            appstore.util.console.log('ack received from', event.origin, 'at', (new Date()).getTime());
        }

        countOfReceivedSecurityMessages++;

        var areGenuineNative = isGenuineNative(receiveMessage) &&
            isGenuineNative(window.parent.postMessage) && isGenuineNative(setTimeout);

        isChecked = isInDomain(parentDomain, receivedMessage.URL) &&
            (receivedMessage.secret === secret) && areGenuineNative;

        if (isChecked) {
            /* Executes original onLoadHandlers if mocked gadgets.util.runOnLoadHandlers was called.
             Otherwise rollbacks gadgets.util.runOnLoadHandlers to its original state and
             when it will be called it will do what it suppose to do.
             */

            if (receivedMessage.eventsContext) {
                appstore.events.initialContext = receivedMessage.eventsContext;
            }

            if (isOnLoadHandlersFired) {
                startUpWidget();
            } else {
                appstore.util.runOnLoadHandlers = function () {
                    startUpWidget();
                };
            }
        } else {
            blockApp();
        }
    };
    var performHandshake = function (timeout) {
        if (!window.addEventListener) {
            receiveMessage('onmessage', receiveAckMessage);
        } else {
            receiveMessage('message', receiveAckMessage, false);
        }

        // Use simple security for only browsers supporting postMessage.
        appstore.util.runOnLoadHandlers = function() {
            /* Indicates that gadgets.util.runOnLoadHandlers function was called
             earlier than parent send ack message. When ack message will be received
             (see: receiveMessage) and all security checks are valid then original
             handlers will be called.
             */
            isOnLoadHandlersFired = true;
            // We decided that this timeout would be enough to receive ack message.
            setTimeout(appstoreSecurityValidate, timeout);
        };

        //we expect that parent window contains container security api
        try {
            if (debug) {
                appstore.util.console.log('send syn to', parentDomain, 'at', (new Date()).getTime());
            }

            secret = 'appstore:' + (new Date().getTime() + Math.random()).toString();
            window.parent.postMessage(secret, parentDomain);
        } catch (e) {
            blockApp();
        }
    };

    var isDomainInListOfAllowedDomains = function(){
        var i;
        for(i = 0; i < allowedDomains.length; i++){
            if(isInDomain(parentDomain, allowedDomains[i])){
                return true;
            }
        }

        return false;
    };

    if (!isDomainInListOfAllowedDomains() || !isInDomain(parentDomain, document.referrer) ) {
        setTimeout(function () {
            blockApp();
        }, 0);
    } else {
        performHandshake(15000);
    }
}(appstore));
