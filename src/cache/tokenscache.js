/**
 * Created by Ruslan_Dulina on 9/15/2014.
 */
(function () {
    'use strict';

    var restServicesRequester = require('./../processor/modules/restservicesrequester');
    var storage = require('./../globalstorage').getStorage();
    var widgetCache = require('./widgetcache');
    var logger = require('./../logger/logger')(module);
    var Guid = require('guid');
    var expirationTokenTime = storage.expirationTokenTime;

    exports.remove = function(userId, widgetId){
        var key = this.generateKey(userId, widgetId);
        delete storage.cache.tokens[key];
    };

    exports.refreshToken = function (widgetId, expiresIn, userId, token) {
        var key = this.generateKey(userId, widgetId);
        storage.cache.tokens[key] = token;
        var timeNow = new Date();
        storage.cache.tokens[key + 'exp'] = timeNow.getTime() + expiresIn;
    };

    exports.generateKey = function (userId, widgetId) {
        var result = userId.replace(/\./g,'-') + '.' +
            widgetId.replace(/\./g,'-');
        return result;
    };

    exports.getNewToken = function (widgetId, userId, callback, errorCallback, notFoundCallback) {
        var xml = widgetCache.getXml(widgetId), that = this;
        if(xml){
            restServicesRequester.getToken(xml, userId, function(token, expiresIn){
                if(token){
                    that.refreshToken(widgetId, expiresIn, userId, token);
                }
                callback(token, true);
            }, errorCallback);
        }
        else{
            var guid = Guid.create();
            logger.error('Cann\'t find widget: ' + widgetId, {id: guid.value});
            notFoundCallback(widgetId);
        }
    };

    exports.getToken = function (widgetId, userId, callback, errorCallback, notFoundCallback) {
        var key = this.generateKey(userId, widgetId);
        if(storage.cache.tokens[key]){
            if(this.isTokenExpired(key)){
                this.getNewToken(widgetId, userId, callback, errorCallback, notFoundCallback);
            }
            else{
                callback(storage.cache.tokens[key], false);
            }
        }
        else{
            this.getNewToken(widgetId, userId, callback, errorCallback, notFoundCallback);
        }
    };

    exports.isTokenExpired = function(key){
        var expiration = storage.cache.tokens[key + 'exp'];
        var now = Date.now();
        return parseInt(expiration, 10) - now < expirationTokenTime;
    };
}());