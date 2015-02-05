/* start of security/security.container.js */
(function(appstore) {
    'use strict';

    var debug = false;
    var getOrigin = function (url) {
        var host, slashPos, protocol, portStr, portPos, port;

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
        host = url.substring(url.indexOf('://') + 3);

        // Find the first slash char, delimiting the host:port.
        slashPos = host.indexOf('/');
        if (slashPos !== -1) {
            host = host.substring(0, slashPos);
        }

        protocol = url.substring(0, url.indexOf('://'));

        // Use port only if it's not default for the protocol.
        portStr = '';
        portPos = host.indexOf(':');
        if (portPos !== -1) {
            port = host.substring(portPos + 1);
            host = host.substring(0, portPos);
            if ((protocol === 'http' && port !== '80') ||
                (protocol === 'https' && port !== '443')) {
                portStr = ':' + port;
            }
        }

        // Return <protocol>://<host>[<port>]
        return protocol + '://' + host + portStr;
    };
    var receiveSynMessage = function (event) {
        // TODO: investigate whether we really need this check
        if (getOrigin(event.origin) !== getOrigin('<%%=viewerUrl%%>')) {
            return;
        }

        if (!event.data || typeof event.data !== 'string' || event.data.indexOf('appstore:') !== 0) {
            return;
        }

        if (debug) {
            appstore.console.log('syn received from', event.origin, 'at', (new Date()).getTime());
        }

        var message = {
            secret: event.data,
            URL: document.URL,
            eventsContext: appstore.events.getContext()
        };
        // IE doesn't work well with complex objects being sent,
        // so build a string instead of sending plain js objects
        if (debug) {
            appstore.console.log('send ack to', event.origin, 'at', (new Date()).getTime());
        }

        event.source.postMessage(JSON.stringify(message), event.origin);
    };

    appstore.util.receiveMessage(receiveSynMessage);
}(appstore));
/* end of security/security.common.js */