(function (appstore) {
    'use strict';
    /**
     * @fileoverview Integration API for easy creating applications in third party client sites.
     */

    /**
     * Creates an iframe application.
     * @param {string} id This parameter will be assigned the iframe id and iframe name,
     * so avoid using of whitespaces in this parameter.
     * @param {HTMLElement} container Application container.
     * @param {object} attrs key-value collection of attrs for the iframe application.
     * @param {string } signedUrl the application URL.
     */
    appstore.addApplication = function (id, container, attrs, signedUrl) {
        var iframeText = '<iframe', attr,
            containerElementId = container;

        var isDomElement = function (element) {
            return (element && typeof element === 'object' && element.nodeType && element.nodeType === 1);
        };

        if (typeof container === 'string' || container instanceof String) {
            container = document.getElementById(container);
        } else if (isDomElement(container)) {
            containerElementId = container.id;
        }

        if (!id || !signedUrl) {
            throw new Error('Parameters id and signedUrl are mandatory.');
        }

        if (!isDomElement(container)) {
            throw new Error('DOM element with ID "' + containerElementId +
                '" is required to render the widget "' + id + '".');
        }

        attrs = attrs || {};
        attrs.id = id.replace(/\s/g, '-');
        attrs.name = attrs.id;
        attrs.src = signedUrl + '&frameId=' + encodeURIComponent(attrs.id);

        /**
         * The RPC code requires that the 'name' attribute be properly set on the
         * iframe.  However, setting the 'name' property on the iframe object
         * returned from 'createElement('iframe')' doesn't work on IE --
         * 'window.name' returns null for the code within th e iframe.  The
         * workaround is to set the 'innerHTML' of a span to the iframe's HTML code,
         * with 'name' and other attributes properly set.
         */
        attrs.name = attrs.id;
        for (attr in attrs) {
            if (attrs.hasOwnProperty(attr)) {
                iframeText += ' ' + attr + '="' + attrs[attr] + '"';
            }
        }

        iframeText += '></iframe>';
        container.innerHTML = iframeText;

        return container.children[0];
    };
}(appstore));
