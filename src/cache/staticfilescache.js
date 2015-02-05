/**
 * Created by Ruslan_Dulina on 9/19/2014.
 */

(function () {
    'use strict';

    var storage = require('./../globalstorage').getStorage();

    exports.getTemplateHtml = function () {
        return storage.staticFiles.htmlTemplate;
    };

    exports.getWidgetJsonTemplate = function () {
        return storage.staticFiles.applicationWeb;
    };

    exports.getFileByName = function (name) {
        return storage.staticFiles[name];
    };

    exports.getCertificate = function () {
        return storage.staticFiles.appsngenCertificate;
    };

    exports.getCookieKey = function () {
        return storage.appsngenCookieKey;
    };
}());