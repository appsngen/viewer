/**
 * Created by Ruslan_Dulina on 9/15/2014.
 */

(function () {
    'use strict';
    var storage = require('./../globalstorage').getStorage();

    exports.updateCache = function (originZip, widgetId) {
        storage.cache.widgetCache[widgetId] = originZip;
    };

    exports.remove = function (widgetId) {
        delete storage.cache.widgetCache[widgetId];
    };

    exports.getOriginZip = function(widgetId){
        return storage.cache.widgetCache[widgetId];
    };

    exports.getXml = function (widgetId) {
        var widget = storage.cache.widgetCache[widgetId], result;
        if(widget){
            result = storage.cache.widgetCache[widgetId].xml;
        }
        return result;
    };

    exports.getHtml = function (widgetId) {
        var xml = storage.cache.widgetCache[widgetId].xml;
        var file = storage.cache.widgetCache[widgetId].files[xml.applicationHtml], result;
        if(file){
            result = storage.cache.widgetCache[widgetId].files[xml.applicationHtml]._data;
        }
        return result;
    };

    exports.getPreferences = function (widgetId) {
        return storage.cache.widgetCache[widgetId].globalPreferences;
    };

    exports.getResource = function (widgetId, path) {
        var file = storage.cache.widgetCache[widgetId].files[path], result;
        if(file){
            result = storage.cache.widgetCache[widgetId].files[path]._data;
        }
        return result;
    };
}());