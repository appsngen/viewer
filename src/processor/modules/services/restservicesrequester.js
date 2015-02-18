/**
 * Created by Ruslan_Dulina on 8/8/2014.
 */

(function () {
    'use strict';
    var storage = require('./../../../globalstorage').getStorage();
    var cache = require('./../../../cache/cache');
    var restserviceConfig;
    var BaseServiceRequester = require('./baseservicerequester');
    var util = require('util');

    var RestServiceRequester = function(){
        restserviceConfig = storage.restserviceConfig;
        BaseServiceRequester.apply(this, arguments);
    };

    util.inherits(RestServiceRequester, BaseServiceRequester);

    RestServiceRequester.prototype.getPreferences = function (organizationId, userId, callback, errorCallback) {
        var encodedOrg = encodeURIComponent(organizationId), globalPreferences = {}, that = this;
        cache.getServiceToken(userId, function(serviceToken){
            var getOptions = {
                hostname: restserviceConfig.preferencesService.host,
                path: restserviceConfig.preferencesService.path + encodedOrg,
                port: restserviceConfig.preferencesService.port,
                method: 'GET',
                rejectUnauthorized: false,
                headers: {
                    'Authorization':  'Bearer ' + serviceToken,
                    'Content-Type': 'application/json'
                }
            };

            that.sendRequest(getOptions, function (response) {
                globalPreferences.lastModifiedPreferences = response.lastModified;
                globalPreferences.organizationPreferences = response.preferences;
                callback(globalPreferences);
            }, errorCallback);
        }, errorCallback);
    };

    RestServiceRequester.prototype.getWidgetPreferences = function (orgId, userId, widgetId, callback, errorCallback) {
        var encodedOrganizationId = encodeURIComponent(orgId),
            encodedWidgetId = encodeURIComponent(widgetId),
            path = restserviceConfig.widgetPreferencesService.path +
                encodedOrganizationId + '&widgetId=' + encodedWidgetId, that = this;
        cache.getServiceToken(userId, function(serviceToken) {
            var getOptions = {
                hostname: restserviceConfig.widgetPreferencesService.host,
                path: path,
                method: 'GET',
                port: restserviceConfig.widgetPreferencesService.port,
                headers: {
                    'Authorization': 'Bearer ' + serviceToken,
                    'Content-Type': 'application/json'
                }
            };

            that.sendRequest(getOptions, function (response) {
                callback(response);
            }, errorCallback);
        }, errorCallback);
    };

    RestServiceRequester.prototype.getServiceToken = function (services, userId, callback, errorCallback) {
        var that = this, options;
        var postData = {
            'scope': {
                'services': services
            }
        };
        options = that.getTokenOptions(userId);

        var postOptions = {
            hostname: restserviceConfig.tokenService.host,
            port: restserviceConfig.tokenService.port,
            path: options.urlPath,
            method: 'POST',
            headers: {
                'Authorization': options.authorization,
                'Content-Type': 'application/json'
            },
            requestBody: JSON.stringify(postData)
        };

        that.sendRequest(postOptions, function (response) {
            callback(response.accessToken, response.expiresIn);
        }, errorCallback);
    };

    RestServiceRequester.prototype.widgetUpload = function (query, body, callback, errorCallback) {
        var postData = new Buffer(body, 'binary'), orgId = encodeURIComponent(query.organizationId), that = this;
        cache.getServiceToken(query.userId, function(serviceToken) {
            var postOptions = {
                hostname: restserviceConfig.uploadService.host,
                port: restserviceConfig.uploadService.port,
                path: restserviceConfig.uploadService.path + orgId,
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + serviceToken,
                    'Content-Length': postData.length,
                    'Accept-Encoding': 'gzip'
                },
                requestBody: postData
            };
            that.sendRequest(postOptions, function (response, status) {
                callback(response, status);
            }, errorCallback);
        });
    };

    RestServiceRequester.prototype.widgetUpdate = function (query, body, callback, errorCallback) {
        var postData = new Buffer(body, 'binary'), orgId = encodeURIComponent(query.organizationId), that = this;
        cache.getServiceToken(query.userId, function(serviceToken) {
            var postOptions = {
                hostname: restserviceConfig.uploadService.host,
                port: restserviceConfig.uploadService.port,
                path: restserviceConfig.uploadService.path + orgId,
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + serviceToken,
                    'Content-Length': postData.length,
                    'Accept-Encoding': 'gzip'
                },
                requestBody: postData
            };

            that.sendRequest(postOptions, function (response, status) {
                callback(response, status);
            }, errorCallback);
        });
    };

    RestServiceRequester.prototype.widgetDelete = function (widgetId, userId, orgId, callback, errorCallback) {
        var path = restserviceConfig.deleteService.path +
            widgetId + '?organizationId=' + orgId, that = this;
        cache.getServiceToken(userId, function(serviceToken) {
            var postOptions = {
                hostname: restserviceConfig.deleteService.host,
                port: restserviceConfig.deleteService.port,
                path: path,
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + serviceToken,
                    'Accept-Encoding': 'gzip'
                }
            };

            that.sendRequest(postOptions, function (response, status) {
                callback(response, status);
            }, errorCallback);
        });
    };

    module.exports = RestServiceRequester;
}());