/**
 * Created by Ruslan_Dulina on 9/4/2014.
 */

(function () {
    'use strict';
    var errorMessage = 'Internal server error';
    var errorUnauthorized = 'Bad token.';
    var validationErrorMessage = 'There have been validation errors.';
    var statusCodes = {
        internalErrorCode: 500,
        notImplementedCode: 501,
        notFoundCode: 404,
        badRequestCode: 400,
        unauthorizedCode: 401,
        okCode: 200,
        createdCode: 201,
        forbiddenCode: 403
    };
    var storage = require('./../globalstorage').getStorage();

    exports.sendEmptyResponse = function (response, code) {
        response.status(code).send();
    };

    exports.sendAccessForbidden =function(response, message){
        this.sendResponse(response, JSON.stringify({
            message: message
        }), statusCodes.forbiddenCode, 'application/json');
    };

    exports.sendResponse = function (response, message, code, contentType) {
        response.set('Content-Type', contentType);
        response.status(code).send(message);
    };

    exports.sendValidationError = function(response, id){
        this.sendResponse(response, JSON.stringify({
            message: validationErrorMessage,
            id: id
        }), statusCodes.badRequestCode, 'application/json');
    };

    exports.sendUnauthorized = function(request, response, message, isJson){
        var unauthorizedMessage = errorUnauthorized, acceptHeader;
        acceptHeader = request.headers && request.headers.accept;
        acceptHeader = acceptHeader && acceptHeader.toLowerCase();
        if(message){
            unauthorizedMessage = unauthorizedMessage + ' ' + message;
        }
        if (acceptHeader && acceptHeader.indexOf('application/json') !== -1 || isJson) {
            this.sendResponse(response, JSON.stringify({
                message: unauthorizedMessage
            }), statusCodes.unauthorizedCode, 'application/json');
        } else {
            response.status(statusCodes.unauthorizedCode);
            response.render('accessForbidden.html', { message: unauthorizedMessage});
        }
    };

    exports.standardErrorCallback = function (response, id, message) {
        var answerMessage = errorMessage;
        if (message) {
            answerMessage = message;
        }
        this.sendResponse(response, JSON.stringify({
            message: answerMessage,
            id: id
        }), statusCodes.internalErrorCode, 'application/json');
    };

    exports.sendHtmlNotFound = function(response, resourceName){
        response.status(statusCodes.notFoundCode);
        response.render('notFound.html', { resource: resourceName, baseUrl: storage.baseUrl });
    };

    exports.htmlErrorCallback = function(response, id, httpCode){
        if(!httpCode){
            httpCode = statusCodes.internalErrorCode;
        }
        response.status(httpCode);
        response.render('500.html', { id: id, baseUrl: storage.baseUrl });
    };

    exports.synchronizationConfiguration = function(){
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

    exports.uploadDeleteConfiguration = function(response, additional){
        var complete = false, isError =false, serviceResponse = {}, statusCode, that = this;
        var controllerConfiguration = {
            additional: additional,
            globalErrorCallback: function (id, message) {
                that.standardErrorCallback(response, id, message);
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
                            if(statusCode === statusCodes.okCode || statusCode === statusCodes.createdCode){
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
                }, 500);
            }
        };

        return controllerConfiguration;
    };

    exports.getWidgetConfiguration = function(response, type){
        var that = this;

        var controllerConfiguration = {
            globalErrorCallback: function (id, httpCode) {
                that.htmlErrorCallback(response, id, httpCode);
            },
            globalSuccessCallback: function (sendData, code) {
                if(!code){
                    code = statusCodes.okCode;
                }
                that.sendResponse(response, sendData, code, type);
            },
            notFoundCallback: function(message){
                if(message){
                    that.sendResponse(response, JSON.stringify({
                        message: message
                    }), statusCodes.notFoundCode, 'application/json');
                }else{
                    that.sendEmptyResponse(response, statusCodes.notFoundCode);
                }

            },
            notFoundHtmlCallback: function(resourceName){
                that.sendHtmlNotFound(response, resourceName);
            }
        };
        return controllerConfiguration;
    };
}());