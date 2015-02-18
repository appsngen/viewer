/**
 * Created by Ruslan_Dulina on 2/12/2015.
 */
(function () {
    'use strict';
    var BaseProcessorConfiguration = require('./baseprocessorconfiguration');
    var util = require('util');

    var StubProcessConfiguration = function(){
        BaseProcessorConfiguration.apply(this, arguments);
    };

    util.inherits(StubProcessConfiguration, BaseProcessorConfiguration);

    StubProcessConfiguration.prototype.synchronizationConfiguration = function(){
        var controllerConfiguration = {
            globalErrorCallback: function () {
                process.exit(1);
            },
            globalSuccessCallback: function () {
                process.exit(0);
            }
        };

        return controllerConfiguration;
    };

    StubProcessConfiguration.prototype.uploadDeleteConfiguration = function(response, additional){
        var isError =false, serviceResponse = {}, statusCode, that = this, result;
        var controllerConfiguration = {
            additional: additional,
            globalErrorCallback: function (id, message, status) {
                if(status === that.statusCodes.badRequestCode){
                    that.sendValidationError(response, id, message);
                }else{
                    that.standardErrorCallback(response, id, message);
                }
            },
            uploadServiceSuccess : function(response, status){
                serviceResponse = response;
                statusCode = status;
            },
            uploadServiceError : function(){
                isError = true;
            },
            globalSuccessCallback: function (params, callback) {
                if (!isError) {
                    if (!callback) {
                        statusCode = 409;
                    }

                    result = JSON.stringify({
                        message: params.config ? params.config.xml.widgetId : params
                    });

                    if (callback) {
                        callback(params, function () {
                            that.sendResponse(response, result, statusCode, 'application/json');
                        }, that.standardErrorCallback);
                    } else {
                        that.sendResponse(response, result, statusCode, 'application/json');
                    }
                }
                else {
                    that.standardErrorCallback(response);
                }
            }
        };

        return controllerConfiguration;
    };

    StubProcessConfiguration.prototype.getWidgetConfiguration = function(response, type){
        var that = this;

        var controllerConfiguration = {
            globalErrorCallback: function (id, httpCode) {
                that.htmlErrorCallback(response, id, httpCode);
            },
            globalSuccessCallback: function (sendData, code) {
                if(!code){
                    code = that.statusCodes.okCode;
                }
                that.sendResponse(response, sendData, code, type);
            },
            notFoundCallback: function(message){
                if(message){
                    that.sendResponse(response, JSON.stringify({
                        message: message
                    }), that.statusCodes.notFoundCode, 'application/json');
                }else{
                    that.sendEmptyResponse(response, that.statusCodes.notFoundCode);
                }

            },
            notFoundHtmlCallback: function(resourceName){
                that.sendHtmlNotFound(response, resourceName);
            }
        };
        return controllerConfiguration;
    };

    module.exports = StubProcessConfiguration;
}());