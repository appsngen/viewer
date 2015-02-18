/**
 * Created by Ruslan_Dulina on 8/12/2014.
 */

(function () {
    'use strict';
    var storage = require('./../../../globalstorage').getStorage();
    var repository = require('./../../../dataproviders/iprovider');
    var cache = require('./../../../cache/cache');
    var publisher = require('./../../../rabbitmq/viewerpublisher');
    var logger = require('./../../../logger/logger')(module);

    exports.getAdditionalResource = function (filename, callback, notFoundCallback) {
        var file = cache.getFileByName(filename);
        if(file){
            callback(file);
        }
        else{
            notFoundCallback(filename);
        }
    };

    exports.deleteWidget = function (params, callback) {
        params.id = cache.getCache().id;
        params.type = 'widgetDeleted';
        callback(params, this.deleteWidgetTransaction.bind(this));
    };

    exports.deleteWidgetTransaction = function (params, callback, errorCallback) {
        repository.deleteWidget(params, function () {
            cache.updateCache(params);
            if(storage.rabbitMqConfiguration.amqpChannel){
                publisher.publish(JSON.stringify(params), storage.rabbitMqConfiguration.amqpChannel);
            }
            else{
                logger.warn('Can\'t inform all instances of viewer about widget deletion');
            }
            callback();
        }, errorCallback);
    };

    exports.getResourceFilePath = function (uri) {
        var pathArray = uri.split('/'), filePath = '';
        /**
         * {viewer domain}/organizations/
         * urn:org:top_investing/widgets/urn:app:top_investing:global_preferences_demo/index.html;
         * cut index.html part of url;
         */
        pathArray.splice(0, 5);
        pathArray.forEach(function (element, index) {
            if (index === pathArray.length - 1) {
                filePath = filePath + element;
            } else {
                filePath = filePath + element + '/';
            }
        });

        return filePath;
    };

    exports.getRequestResourceParams = function (uri, credentials) {
        var pathArray = uri.split('/');
        /**
         * {viewer domain}/organizations/
         * urn:org:top_investing/widgets/urn:app:top_investing:global_preferences_demo/index.html;
         * organizationId is the second part of url: urn:org:top_investing
         * widgetId is the 4 part of url: urn:app:top_investing:global_preferences_demo
         * @type {{organizationId: *, clientUserId: (credentials.userId|*), widgetId: *,
         * clientOrganizationId: (credentials.clientId|*), id: *}}
         */
        var params = {
            organizationId: pathArray[2].toLowerCase(),
            clientUserId: credentials.userId.toLowerCase(),
            widgetId: pathArray[4].toLowerCase(),
            clientOrganizationId: credentials.clientId.toLowerCase(),
            id: cache.getCache().id
        };

        return params;
    };

    exports.compileResource = function (lessProcessor, params, callback, errorCallback) {
        var organizationPreferences = params.globalPreferences.organizationPreferences;
        lessProcessor.compileLess(params.result, organizationPreferences, function (data, error, id) {
            if (error) {
                callback(data + ' id: ' + id, 500);
            } else {
                var time = params.globalPreferences.lastModifiedPreferences;
                cache.setCompiledResource(params, data, time);
                callback(data, 200);
            }
        }, errorCallback);
    };

    exports.getResource = function (inputModel, callback, errorCallback, notFoundCallback) {
        var filePath = this.getResourceFilePath(inputModel.uri), that = this;
        var params = this.getRequestResourceParams(inputModel.uri, inputModel);
        var xml = cache.getOriginWidgetXml(params.widgetId);
        var pathHtml = xml.applicationHtml;
        var arrayPath = pathHtml.split('/');
        var basePath = arrayPath.slice(0, arrayPath.length - 1).join().replace(/,/g, '/');
        var result = cache.getOriginWidgetResource(params.widgetId, basePath + filePath);

        if(result) {
            if (filePath.indexOf('.less') === -1) {
                callback(new Buffer(result, 'binary'));
            }
            else {
                cache.getOrganizationPreferences(params.clientOrganizationId, params.clientUserId,
                    function (globalPreferences) {
                        params.globalPreferences = globalPreferences;
                        params.result = result;
                        params.filePath = filePath;
                        var compiledResource = cache.getCompiledResource(params);
                        if (compiledResource) {
                            if (compiledResource.lastModifiedPreferences ===
                                globalPreferences.lastModifiedPreferences) {
                                callback(compiledResource.data);
                            }
                            else {
                                that.compileResource(inputModel.lessProcessor, params, callback, errorCallback);
                            }
                        }
                        else {
                            that.compileResource(inputModel.lessProcessor, params, callback, errorCallback);
                        }
                    }, errorCallback);
            }
        }
        else{
            notFoundCallback();
        }
    };

    exports.getRequestHtmlParams = function (reqInfo) {
        var pathArray = reqInfo.filename.split('/');
        /**
         * {viewer domain}/organizations/
         * urn:org:top_investing/widgets/urn:app:top_investing:global_preferences_demo/index.html;
         * organizationId is the second part of url: urn:org:top_investing
         * widgetId is the 4 part of url: urn:app:top_investing:global_preferences_demo
         * @type {{organizationId: *, clientUserId: (credentials.userId|*), widgetId: *,
         * clientOrganizationId: (credentials.clientId|*), id: *}}
         */
        var params = {
            organizationId: pathArray[2].toLowerCase(),
            clientUserId: reqInfo.query.userId.toLowerCase(),
            widgetId: pathArray[4].toLowerCase(),
            clientOrganizationId: reqInfo.query.clientId.toLowerCase(),
            id: cache.getCache().id
        };

        return params;
    };

    exports.getHtml = function (reqInfo, callback, errorCallback, notFoundCallback) {
        var params = this.getRequestHtmlParams(reqInfo);
        cache.getWidgetPreferences(params.clientOrganizationId, params.clientUserId, params.widgetId,
            function (widgetPreferences, widgetPreferencesTimestamp) {
                cache.getToken(params.widgetId, params.clientUserId, function (token, isNewToken) {
                    var result, htmlTimestamp;
                    htmlTimestamp = cache.getHtmlTimestamp(params.widgetId, params.clientUserId);
                    if (!isNewToken && widgetPreferencesTimestamp === htmlTimestamp) {
                        result = cache.getHtml(params.widgetId, params.clientUserId);
                    }
                    else {
                        var xml = cache.getOriginWidgetXml(params.widgetId);
                        var html = cache.getOriginWidgetHtml(params.widgetId);
                        if(html){
                            result = reqInfo.htmlProcessor.createRequestedHtml(xml, html, widgetPreferences, token);
                            cache.setHtml(params.widgetId, params.clientUserId, result, widgetPreferencesTimestamp);
                        }
                    }
                    if(result){
                        callback(result);
                    }
                    else{
                        notFoundCallback(params.widgetId);
                    }
                }, errorCallback, notFoundCallback);
            }, errorCallback);
    };
}());