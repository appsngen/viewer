/**
 * Created by Ruslan_Dulina on 8/8/2014.
 */

(function () {
    'use strict';
    var storage = require('./../../globalstorage').getStorage();
    var protocol = require('http');
    var logger = require('./../../logger/logger')(module);
    var cache = require('./../../cache/cache');
    var restserviceConfig = storage.restserviceConfig;
    var Guid = require('guid');
    var statusCodes = {
        internalErrorCode: 500,
        notImplementedCode: 501,
        notFoundCode: 404
    };
    if(restserviceConfig.protocol === 'https'){
        protocol = require('https');
    }
    exports.getPreferences = function (organizationId, userId, callback, errorCallback) {
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

            that.sendRequest(getOptions, protocol, function (response) {
                globalPreferences.lastModifiedPreferences = response.lastModified;
                globalPreferences.organizationPreferences = response.preferences;
                callback(globalPreferences);
            }, errorCallback);
        }, errorCallback);
    };

    exports.getWidgetsList = function(userId, callback, errorCallback){
        var that = this;
        cache.getServiceToken(userId, function(serviceToken){
            var getOptions = {
                hostname: restserviceConfig.gadgetManagementService.host,
                path: restserviceConfig.gadgetManagementService.path,
                port: restserviceConfig.gadgetManagementService.port,
                method: 'GET',
                rejectUnauthorized: false,
                headers: {
                    'Authorization':  'Bearer ' + serviceToken,
                    'Content-Type': 'application/json'
                }
            };

            that.sendRequest(getOptions, protocol, function (response) {
                callback(response.list);
            }, errorCallback);
        }, errorCallback);
    };

    exports.downloadWidget = function(userId, widgetId, organizationId, callback, errorCallback){
        var encodedOrganizationId = encodeURIComponent(organizationId), that = this;
        var encodedWidgetId = encodeURIComponent(widgetId);
        var requestPath = restserviceConfig.widgetsDownloadService.path + '/' + encodedWidgetId +
            '/archive?organizationId=' + encodedOrganizationId;
        cache.getServiceToken(userId, function(serviceToken){
            var getOptions = {
                hostname: restserviceConfig.widgetsDownloadService.host,
                path: requestPath,
                port: restserviceConfig.widgetsDownloadService.port,
                method: 'GET',
                rejectUnauthorized: false,
                headers: {
                    'Authorization':  'Bearer ' + serviceToken,
                    'Content-Type': 'application/json'
                },
                additional: true
            };

            that.sendRequest(getOptions, protocol, function (response) {
                var result = {
                    zip: response,
                    organizationId: organizationId,
                    userId: userId,
                    widgetId: widgetId
                };
                callback(result);
            }, errorCallback);
        }, errorCallback);
    };

    exports.getWidgetPreferences = function (orgId, userId, widgetId, callback, errorCallback) {
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

            that.sendRequest(getOptions, protocol, function (response) {
                callback(response);
            }, errorCallback);
        }, errorCallback);
    };

    exports.sendRequest = function (options, transferProtocol, callback, errorCallback) {
        var dataResponse = '', result, guid;
        var request = transferProtocol.request(options, function (res) {
            if(options.additional){
                res.setEncoding('binary');
            }
            res.on('data', function (chunk) {
                dataResponse += chunk;
            });

            res.on('end', function () {
                try {
                    if(this.headers['content-type'].indexOf('application/json') !== -1){
                        result = JSON.parse(dataResponse);
                    }
                    else{
                        result = dataResponse;
                    }
                    if(this.statusCode === statusCodes.internalErrorCode ||
                        this.statusCode === statusCodes.notImplementedCode ||
                        this.statusCode === statusCodes.notFoundCode){
                        guid = Guid.create();
                        delete options.requestBody;
                        var error = new Error('Service return ' + this.statusCode + ' code. Options: ' +
                            JSON.stringify(options));
                        logger.error(error.message.toString(), {id: guid.value});
                        errorCallback(error, guid.value);
                    }
                    else{
                        callback(result, this.statusCode);
                    }
                }
                catch (exception) {
                    guid = Guid.create();
                    logger.error(exception, {id: guid.value});
                    errorCallback(exception, guid.value);
                }
            });

            res.on('error', function (error) {
                var guid = Guid.create();
                logger.error(error, {id: guid.value});
                errorCallback(error, guid.value);
            });
        });
        if (options.requestBody) {
            request.write(options.requestBody);
        }
        request.end();
        request.on('error', function (error) {
            var guid = Guid.create();
            logger.error(error, {id: guid.value, options: options});
            errorCallback(error, guid.value);
        });
    };

    exports.getToken = function (xml, userId, callback, errorCallback) {
        var that = this, authorization, signature, userPassword, urlPath;
        if(xml.dataSources.length || xml.streams.length){
            var postData = {
                'scope': {
                    'dataSources': xml.dataSources,
                    'streams' : xml.streams
                }
            };

            if(storage.masterToken){
                urlPath = restserviceConfig.tokenService.path + encodeURIComponent(userId);
                authorization = 'Bearer ' + storage.masterToken;
            }
            else{
                urlPath = restserviceConfig.tokenService.additionalPath;
                userPassword = storage.user.name + ':' + storage.user.password;
                signature = new Buffer(userPassword).toString('base64');
                authorization = 'Basic ' + signature;
            }
            var postOptions = {
                hostname: restserviceConfig.tokenService.host,
                port: restserviceConfig.tokenService.port,
                path: urlPath,
                method: 'POST',
                headers: {
                    'Authorization': authorization,
                    'Content-Type': 'application/json'
                },
                requestBody: JSON.stringify(postData)
            };

            that.sendRequest(postOptions, protocol, function (response) {
                callback(response.accessToken, response.expiresIn);
            }, errorCallback);
        }
        else{
            callback();
        }
    };

    exports.getServiceToken = function (services, userId, callback, errorCallback) {
        var that = this, urlPath, userPassword, signature, authorization;
        var postData = {
            'scope': {
                'services': services
            }
        };
        if(storage.masterToken){
            urlPath = restserviceConfig.tokenService.path + encodeURIComponent(userId);
            authorization = 'Bearer ' + storage.masterToken;
        }
        else{
            urlPath = restserviceConfig.tokenService.additionalPath;
            userPassword = storage.user.name + ':' + storage.user.password;
            signature = new Buffer(userPassword).toString('base64');
            authorization = 'Basic ' + signature;
        }
        var postOptions = {
            hostname: restserviceConfig.tokenService.host,
            port: restserviceConfig.tokenService.port,
            path: urlPath,
            method: 'POST',
            headers: {
                'Authorization': authorization,
                'Content-Type': 'application/json'
            },
            requestBody: JSON.stringify(postData)
        };

        that.sendRequest(postOptions, protocol, function (response) {
            callback(response.accessToken, response.expiresIn);
        }, errorCallback);
    };

    exports.widgetUpload = function (query, body, callback, errorCallback) {
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
            that.sendRequest(postOptions, protocol, function (response, status) {
                callback(response, status);
            }, errorCallback);
        });
    };

    exports.widgetUpdate = function (query, body, callback, errorCallback) {
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

            that.sendRequest(postOptions, protocol, function (response, status) {
                callback(response, status);
            }, errorCallback);
        });
    };

    exports.widgetDelete = function (widgetId, userId, orgId, callback, errorCallback) {
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

            that.sendRequest(postOptions, protocol, function (response, status) {
                callback(response, status);
            }, errorCallback);
        });
    };
}());