/**
 * Created by Ruslan_Dulina on 11/12/2014.
 */

(function () {
    'use strict';

    var restServicesRequester = require('./../processor/modules/services/iservicerequester');
    var storage = require('./../globalstorage').getStorage();
    var expirationTokenTime = storage.expirationTokenTime;

    exports.refreshToken = function (token, expiresIn) {
        var key = this.generateKey();
        storage.cache.tokens[key] = token;
        var timeNow = new Date();
        storage.cache.tokens[key + 'exp'] = timeNow.getTime() + expiresIn;
    };

    exports.generateKey = function () {
        var key = storage.services.toString();
        return key;
    };

    exports.getNewToken = function (userId, callback, errorCallback) {
        var that = this;
        restServicesRequester.getServiceToken(storage.services, userId, function(token, expiresIn){
            that.refreshToken(token, expiresIn);
            callback(token);
        }, errorCallback);
    };

    exports.getToken = function (userId, callback, errorCallback) {
        var key = this.generateKey();
        if(storage.cache.tokens[key]){
            if(this.isTokenExpired(key)){
                this.getNewToken(userId, callback, errorCallback);
            }
            else{
                callback(storage.cache.tokens[key]);
            }
        }
        else{
            this.getNewToken(userId, callback, errorCallback);
        }
    };

    exports.isTokenExpired = function(key){
        var expiration = storage.cache.tokens[key + 'exp'];
        var now = Date.now();
        return parseInt(expiration, 10) - now < expirationTokenTime;
    };
}());