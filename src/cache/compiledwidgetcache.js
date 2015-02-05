/**
 * Created by Ruslan_Dulina on 9/10/2014.
 */
(function () {
    'use strict';
    var storage = require('./../globalstorage').getStorage();

    exports.generateKey = function (organizationId, widgetId, filePath) {
        var result = widgetId.replace(/\./g,'-') + '.' +
            filePath.replace(/\./g,'-') + '.' +
            organizationId.replace(/\./g,'-');
        return result;
    };

    exports.generateHtmlKey = function (widgetId, clientUserId) {
        var result = widgetId.replace(/\./g,'-') + '.' +
            clientUserId.replace(/\./g,'-');
        return result;
    };

    exports.removeAllByWidgetId = function (widgetId) {
        var widget, deleted = [];
        for (widget in storage.cache.compiledWidgetCache) {
            if (storage.cache.compiledWidgetCache.hasOwnProperty(widget) &&
                widget.split('.')[0] === widgetId) {
                deleted.push(widget);
            }
        }
        deleted.forEach(function(element){
            delete storage.cache.compiledWidgetCache[element];
            delete storage.cache.compiledWidgetCache[element + 'timestamp'];
        });

        return storage.cache.compiledWidgetCache;
    };

    exports.getCompiledResource = function (params) {
        var widgetId = params.widgetId, clientOrganizationId = params.clientOrganizationId, filePath = params.filePath;
        var key = this.generateKey(clientOrganizationId, widgetId, filePath);
        return storage.cache.compiledWidgetCache[key];
    };

    exports.setCompiledResource = function (params, data, time){
        var widgetId = params.widgetId, clientOrganizationId = params.clientOrganizationId, filePath = params.filePath;
        var key = this.generateKey(clientOrganizationId, widgetId, filePath);
        var resutl = {
            data: data,
            lastModifiedPreferences: time
        };
        storage.cache.compiledWidgetCache[key] = resutl;
    };

    exports.getHtml = function(widgetId, clientUserId){
        var key = this.generateHtmlKey(widgetId, clientUserId);
        return storage.cache.compiledWidgetCache[key];
    };

    exports.getHtmlTimestamp = function(widgetId, clientUserId){
        var key = this.generateHtmlKey(widgetId, clientUserId);
        return storage.cache.compiledWidgetCache[key + 'timestamp'];
    };

    exports.setHtml = function(widgetId, clientUserId, html, widgetPreferencesTimestamp){
        var key = this.generateHtmlKey(widgetId, clientUserId);
        storage.cache.compiledWidgetCache[key] = html;
        storage.cache.compiledWidgetCache[key + 'timestamp'] = widgetPreferencesTimestamp;
    };
}());