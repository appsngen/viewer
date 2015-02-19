/**
 * Created by Ruslan_Dulina on 2/12/2015.
 */
/**
 * Created by Ruslan_Dulina on 9/4/2014.
 */

(function () {
    'use strict';
    var storage = require('./../../../globalstorage').getStorage();

    var BaseProcessorConfiguration = function(){
        this.errorMessage = 'Internal server error.';
        this.errorUnauthorized = 'Bad token.';
        this.validationErrorMessage = 'There have been validation errors.';
        this.statusCodes = {
            internalErrorCode: 500,
            notImplementedCode: 501,
            notFoundCode: 404,
            badRequestCode: 400,
            unauthorizedCode: 401,
            okCode: 200,
            createdCode: 201,
            forbiddenCode: 403
        };
    };

    BaseProcessorConfiguration.prototype.sendEmptyResponse = function (response, code) {
        response.status(code).send();
    };

    BaseProcessorConfiguration.prototype.sendAccessForbidden =function(response, message){
        this.sendResponse(response, JSON.stringify({
            message: message
        }), this.statusCodes.forbiddenCode, 'application/json');
    };

    BaseProcessorConfiguration.prototype.sendResponse = function (response, message, code, contentType) {
        response.set('Content-Type', contentType);
        response.status(code).send(message);
    };

    BaseProcessorConfiguration.prototype.sendValidationError = function(response, id, message){
        var answerMessage = this.validationErrorMessage;
        if (message) {
            answerMessage = message;
        }
        this.sendResponse(response, JSON.stringify({
            message: answerMessage,
            id: id
        }), this.statusCodes.badRequestCode, 'application/json');
    };

    BaseProcessorConfiguration.prototype.sendUnauthorized = function(request, response, message, isJson){
        var unauthorizedMessage = this.errorUnauthorized, acceptHeader;
        acceptHeader = request.headers && request.headers.accept;
        acceptHeader = acceptHeader && acceptHeader.toLowerCase();
        if(message){
            unauthorizedMessage = unauthorizedMessage + ' ' + message;
        }
        if (acceptHeader && acceptHeader.indexOf('application/json') !== -1 || isJson) {
            this.sendResponse(response, JSON.stringify({
                message: unauthorizedMessage
            }), this.statusCodes.unauthorizedCode, 'application/json');
        } else {
            response.status(this.statusCodes.unauthorizedCode);
            response.render('accessForbidden.html', { message: unauthorizedMessage});
        }
    };

    BaseProcessorConfiguration.prototype.standardErrorCallback = function (response, id, message) {
        var answerMessage = this.errorMessage;
        if (message) {
            answerMessage = message;
        }
        this.sendResponse(response, JSON.stringify({
            message: answerMessage,
            id: id
        }), this.statusCodes.internalErrorCode, 'application/json');
    };

    BaseProcessorConfiguration.prototype.sendHtmlNotFound = function(response, resourceName){
        response.status(this.statusCodes.notFoundCode);
        response.render('notFound.html', { resource: resourceName, baseUrl: storage.baseUrl });
    };

    BaseProcessorConfiguration.prototype.htmlErrorCallback = function(response, id, httpCode){
        if(!httpCode){
            httpCode = this.statusCodes.internalErrorCode;
        }
        response.status(httpCode);
        response.render('500.html', { id: id, baseUrl: storage.baseUrl });
    };

    module.exports = BaseProcessorConfiguration;
}());
