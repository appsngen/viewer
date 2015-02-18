/**
 * Created by Ruslan_Dulina on 9/4/2014.
 */

(function () {
    'use strict';
    var BaseProcessorConfiguration = require('./baseprocessorconfiguration');
    var util = require('util');

    var DefaultProcessConfiguration = function(){
        BaseProcessorConfiguration.apply(this, arguments);
    };

    util.inherits(DefaultProcessConfiguration, BaseProcessorConfiguration);

    DefaultProcessConfiguration.prototype.synchronizationConfiguration = function(){
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

    DefaultProcessConfiguration.prototype.uploadDeleteConfiguration = function(response, additional){
        var complete = false, isError =false, serviceResponse = {}, statusCode, that = this;
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
                complete = true;
                isError = false;
                statusCode = status;
            },
            uploadServiceError : function(){
                complete = true;
                isError = true;
            },
            globalSuccessCallback: function (params, callback) {
                var interval = setInterval(function(){
                    if(complete){
                        clearInterval(interval);
                        if(!isError){
                            var result = JSON.stringify(serviceResponse);
                            if((statusCode === that.statusCodes.okCode ||
                                statusCode === that.statusCodes.createdCode) && callback){
                                callback(params, function(){
                                    that.sendResponse(response, result, statusCode, 'application/json');
                                }, that.standardErrorCallback);
                            }else{
                                that.sendResponse(response, result, statusCode, 'application/json');
                            }
                        }
                        else{
                            that.standardErrorCallback(response);
                        }
                    }
                }, 100);
            }
        };

        return controllerConfiguration;
    };

    DefaultProcessConfiguration.prototype.getWidgetConfiguration = function(response, type){
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

    module.exports = DefaultProcessConfiguration;
}());
