/**
 * Created by Ruslan_Dulina on 8/15/2014.
 */

(function () {
    'use strict';
    var lessProcessor = require('./modules/lessprocessing'),
        zipProcessor = require('./modules/zipprocessing'),
        xmlProcessor = require('./modules/xmlprocessing'),
        servicesRequester = require('./modules/restservicesrequester'),
        htmlProcessor = require('./modules/htmlprocessing'),
        deepCopy = require('deepcopy'),
        widgetProcessor = require('./modules/widgetprocessing'),
        synctool = require('./../tools/synchronization'),
        each = require('async-each-series');
    var logger = require('./../logger/logger')(module);

    exports.getViewerResource = function (config, filename) {
        widgetProcessor.getAdditionalResource(filename, config.globalSuccessCallback, config.notFoundHtmlCallback);
    };

    exports.ProcessHtml = function (config) {
        htmlProcessor.buildTemplate(config.xml, config.globalPreferences, config.zip, function () {
            zipProcessor.saveZip(config, config.globalSuccessCallback, config.globalErrorCallback);
        }, config.globalErrorCallback);
    };

    exports.GetPreferences = function (config, xml) {
        var that = this;
        config.xml = xml;
        servicesRequester.getPreferences(config.query.organizationId,config.query.userId, function (globalPreferences) {
            config.globalPreferences = globalPreferences;
            that.ProcessHtml(config);
        }, config.globalErrorCallback);
    };

    exports.validateXml = function (config, zip) {
        config.originZip = zip;
        config.zip = deepCopy(zip);
        xmlProcessor.xmlParse(this.GetPreferences.bind(this, config), config.globalErrorCallback,
            config.globalSuccessCallback, config);
    };

    exports.sendToServiceUpload = function (config) {
        var query = config.query, body = config.body;
        servicesRequester.widgetUpload(query, body, config.uploadServiceSuccess, config.uploadServiceError);
    };

    exports.sendToServiceDelete = function (config, widgetId, orgId, userId) {
        servicesRequester.widgetDelete(widgetId, userId, orgId, config.uploadServiceSuccess, config.uploadServiceError);
    };

    exports.deleteWidget = function (config, widgetId, userId, organizationId) {
        var params = {
            widgetId: widgetId,
            userId: userId,
            organizationId: organizationId
        };
        widgetProcessor.deleteWidget(params, config.globalSuccessCallback, config.globalErrorCallback);
    };

    exports.sendToServiceUpdate = function (config) {
        var query = config.query, body = config.body;
        servicesRequester.widgetUpdate(query, body, config.uploadServiceSuccess, config.uploadServiceError);
    };

    exports.getArchive = function(widgetId, config){
        zipProcessor.getOriginArchive(widgetId, config.globalSuccessCallback, config.globalErrorCallback,
            config.notFoundCallback);
    };

    exports.unpackZip = function (config) {
        var that = this;
        zipProcessor.createObjFromZipFile(config.body, that.validateXml.bind(that, config), config.globalErrorCallback);
    };

    exports.runSynchronization = function (config) {
        var that = this, imported = 0, errors = 0;
        synctool.getWidgetList(function(widgets){
            synctool.uploadAllWidgets(widgets, function(result){
                if(result.errors !== 0){
                    config.globalErrorCallback();
                }
                else{
                    var newOperationConfig = {}, widgetIdx = 0;

                    each(result.widgetZips, function (widgetSum, next) {
                        widgetIdx++;
                        logger.info(widgetIdx + ') Widget upload started.');
                        logger.info(widgetSum.organizationId, widgetSum.userId, widgetSum.widgetId);

                        newOperationConfig = {
                            query: {
                                organizationId: widgetSum.organizationId,
                                userId: widgetSum.userId,
                                clientId: widgetSum.organizationId
                            },
                            body: widgetSum.zip,
                            additional: {
                                isCheck: true
                            },
                            globalErrorCallback: function(exception){
                                logger.info(exception.message);
                                errors++;
                                next();
                            },
                            globalSuccessCallback: function (params, callback) {
                                if(params.config){
                                    callback(params, function(){
                                        imported++;
                                        logger.info(widgetSum.organizationId, widgetSum.userId, widgetSum.widgetId +
                                            ' imported successfully');
                                        next();
                                    }, newOperationConfig.globalErrorCallback);
                                }else{
                                    logger.info('Widget ' + params + ' already exist in database');
                                    next();
                                }
                            }
                        };
                        that.unpackZip(newOperationConfig);
                    }, function (error) {
                        if(error){
                            config.globalErrorCallback();
                        }
                        else{
                            config.globalSuccessCallback();
                        }
                    });
                }
            });
        }, config.globalErrorCallback);
    };

    exports.getWidget = function (config, query, filename) {
        var reqInfo = {
            query: query,
            filename: filename,
            htmlProcessor: htmlProcessor
        };

        widgetProcessor.getHtml(reqInfo, config.globalSuccessCallback, config.globalErrorCallback,
            config.notFoundHtmlCallback);
    };

    exports.getResource = function (config, uri, userId, clientId) {
        var inputModel = {
            userId: userId.toLowerCase(),
            clientId: clientId.toLowerCase(),
            uri: uri,
            lessProcessor: lessProcessor
        };
        widgetProcessor.getResource(inputModel, config.globalSuccessCallback, config.globalErrorCallback,
            config.notFoundCallback);
    };
}());