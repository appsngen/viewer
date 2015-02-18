/**
 * Created by Ruslan_Dulina on 2/12/2015.
 */
(function () {
    'use strict';
    var storage = require('./../../../globalstorage').getStorage();
    var protocol, statusCodes;
    var logger = require('./../../../logger/logger')(module);
    var restserviceConfig = storage.restserviceConfig;
    var cache = require('./../../../cache/cache');
    var Guid = require('guid');

    var BaseServiceRequester = function(){
        if(restserviceConfig.protocol === 'https'){
            protocol = require('https');
        }
        else{
            protocol = require('http');
        }
        statusCodes = {
            internalErrorCode: 500,
            notImplementedCode: 501,
            notFoundCode: 404
        };
    };

    BaseServiceRequester.prototype.getWidgetsList = function(userId, callback, errorCallback){
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

            that.sendRequest(getOptions, function (response) {
                callback(response.list);
            }, errorCallback);
        }, errorCallback);
    };

    BaseServiceRequester.prototype.downloadWidget = function(userId, widgetId, organizationId, callback, errorCallback){
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

            that.sendRequest(getOptions, function (response) {
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

    BaseServiceRequester.prototype.sendRequest = function (options, callback, errorCallback) {
        var dataResponse = '', result, guid;
        var request = protocol.request(options, function (res) {
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

    BaseServiceRequester.prototype.getTokenOptions = function(userId){
        var options = {}, userPassword, signature;
        if(storage.masterToken){
            options.urlPath = restserviceConfig.tokenService.bearerTokenPath + encodeURIComponent(userId);
            options.authorization = 'Bearer ' + storage.masterToken;
        }
        else{
            options.urlPath = restserviceConfig.tokenService.basicTokenPath;
            userPassword = storage.user.name + ':' + storage.user.password;
            signature = new Buffer(userPassword).toString('base64');
            options.authorization = 'Basic ' + signature;
        }

        return options;
    };

    BaseServiceRequester.prototype.getToken = function (xml, userId, callback, errorCallback) {
        var that = this, options;
        if(xml.dataSources.length || xml.streams.length){
            var postData = {
                'scope': {
                    'dataSources': xml.dataSources,
                    'streams' : xml.streams
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
        }
        else{
            callback();
        }
    };

    module.exports = BaseServiceRequester;
}());