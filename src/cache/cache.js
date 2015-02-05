/**
 * Created by Ruslan_Dulina on 9/16/2014.
 */

(function () {
    'use strict';
    var storage = require('./../globalstorage').getStorage();
    var repository = require('./../dataproviders/databaseprovider');
    var compiledWidgetCache = require('./compiledwidgetcache');
    var organizationPreferencesCache = require('./organizationpreferencescache');
    var widgetPreferencesCache = require('./widgetpreferencescache');
    var widgetCache = require('./widgetcache');
    var tokenCache = require('./tokenscache');
    var tokenServiceCache = require('./tokensservicescache');
    var staticCache = require('./staticfilescache');
    var each = require('async-each-series');
    var logger = require('./../logger/logger')(module);
    if(storage.dataProvider === 'filesystem'){
        repository = require('./../dataproviders/filesystemprovider');
    }
    exports.updateOriginCacheFromDatabase = function (widgetId) {
        var that = this;
        repository.getWidget(widgetId, function(data){
            that.updateOriginCache(data.compiledData, widgetId);
        }, function(){});
    };

    exports.updateCache = function (params) {
        switch (params.type) {
            case 'widgetUpdated':
                this.updateOriginCacheFromDatabase(params.widgetId);
                this.removeFromCompiledCache(params.widgetId);
                this.updatePreferenceCache(params.globalPreferences);
                this.deleteWidgetPreferenceCache(params.organizationId, params.widgetId);
                break;
            case 'widgetDeleted':
                this.removeFromOriginCache(params.widgetId);
                this.removeFromCompiledCache(params.widgetId);
                this.removeFromTokenCache(params.userId, params.widgetId);
                this.deleteWidgetPreferenceCache(params.organizationId, params.widgetId);
                break;
            case 'globalPreferencesUpdated':
                this.updatePreferenceCache(params.globalPreferences);
                break;
            case 'globalPreferencesDeleted':
                this.deletePreferenceCache(params.organizationId);
                break;
            case 'widgetPreferencesUpdated':
                this.updateWidgetPreferenceCache(params.widgetPreferences, params.widgetId, params.organizationId);
                break;
            case 'widgetPreferencesDeleted':
                this.deleteWidgetPreferenceCache(params.organizationId, params.widgetId);
                break;
        }
    };

    exports.getToken = function (widgetId, userId, callback, errorCallback, notFoundCallback) {
        tokenCache.getToken(widgetId, userId, callback, errorCallback, notFoundCallback);
    };

    exports.getServiceToken = function (userId, callback, errorCallback) {
        tokenServiceCache.getToken(userId, callback, errorCallback);
    };

    exports.getOriginZip = function(widgetId){
        return widgetCache.getOriginZip(widgetId);
    };

    exports.getOriginWidgetXml = function (widgetId) {
        return widgetCache.getXml(widgetId);
    };

    exports.getOriginWidgetHtml = function (widgetId) {
        return widgetCache.getHtml(widgetId);
    };

    exports.setCompiledResource = function (params, data, time){
        compiledWidgetCache.setCompiledResource(params, data, time);
    };

    exports.getCompiledResource = function (params) {
        return compiledWidgetCache.getCompiledResource(params);
    };

    exports.getOrganizationPreferences = function (organizationId, userId, callback, errorCallback) {
        organizationPreferencesCache.getPreferences(organizationId, userId, callback, errorCallback);
    };

    exports.getWidgetPreferences = function (organizationId, userId, widgetId, callback, errorCallback) {
        widgetPreferencesCache.getWidgetPreferences(organizationId, userId,  widgetId, callback, errorCallback);
    };

    exports.getOriginWidgetResource = function (widgetId, path) {
        return widgetCache.getResource(widgetId, path);
    };

    exports.updateOriginCache = function (originZip, widgetId) {
        widgetCache.updateCache(originZip, widgetId);
    };

    exports.removeFromOriginCache = function (widgetId) {
        widgetCache.remove(widgetId);
    };

    exports.removeFromCompiledCache = function (widgetId) {
        compiledWidgetCache.removeAllByWidgetId(widgetId);
    };

    exports.removeFromTokenCache = function(userId, widgetId){
        tokenCache.remove(userId, widgetId);
    };

    exports.getHtml = function(widgetId, clientUserId){
        return compiledWidgetCache.getHtml(widgetId, clientUserId);
    };

    exports.getHtmlTimestamp = function(widgetId, clientUserId){
        return compiledWidgetCache.getHtmlTimestamp(widgetId, clientUserId);
    };

    exports.setHtml = function(widgetId, clientUserId, html, widgetPreferencesTimestamp){
        compiledWidgetCache.setHtml(widgetId, clientUserId, html, widgetPreferencesTimestamp);
    };

    exports.updatePreferenceCache = function (globalPreferences, organizationId) {
        organizationPreferencesCache.updateCache(globalPreferences, organizationId);
    };

    exports.updateWidgetPreferenceCache = function (widgetPreferences, widgetId, organizationId){
        widgetPreferencesCache.updateCache(widgetPreferences, widgetId, organizationId);
    };

    exports.uploadPreferenceCache = function (organizationId, userId, callback, errorCallback) {
        organizationPreferencesCache.loadCache(organizationId, userId, callback, errorCallback);
    };

    exports.deletePreferenceCache = function (organizationId) {
        organizationPreferencesCache.deleteCache(organizationId);
    };

    exports.uploadWidgetPreferenceCache = function (organizationId, userId, widgetId, callback, errorCallback) {
        widgetPreferencesCache.loadCache(organizationId, userId, widgetId, callback, errorCallback);
    };

    exports.deleteWidgetPreferenceCache = function (organizationId, widgetId) {
        widgetPreferencesCache.deleteCache(organizationId, widgetId);
    };

    exports.getTemplateHtml = function () {
        return staticCache.getTemplateHtml();
    };

    exports.getWidgetJsonTemplate = function () {
        return staticCache.getWidgetJsonTemplate();
    };

    exports.getFileByName = function (name) {
        return staticCache.getFileByName(name);
    };

    exports.getCertificate = function () {
        return staticCache.getCertificate();
    };

    exports.getCookieKey = function () {
        return staticCache.getCookieKey();
    };

    exports.getCache = function () {
        return storage;
    };

    exports.createCache = function (callback, errorCallback) {
        var that = this;
        repository.getAllWidgets(function (widgets) {
            each(widgets, function (element, next) {
                var organizationId = element.compiledData.xml.query.organizationId;
                var userId = element.compiledData.xml.query.userId;
                var widgetId = element.widgetId;
                that.updateOriginCache(element.compiledData, element.widgetId);
                logger.info(widgetId + ' added in viewer cache');
                that.uploadPreferenceCache(organizationId, userId, function(){
                    logger.info(widgetId + ' updated organization preferences cache');
                    that.uploadWidgetPreferenceCache(organizationId, userId, widgetId, function(){
                        logger.info(widgetId + ' updated widget preferences cache');
                        next();
                    }, errorCallback);
                },errorCallback);
            }, function(error){
                if(error){
                    errorCallback();
                }
                else{
                    callback();
                }
            });
        }, errorCallback);
    };
}());