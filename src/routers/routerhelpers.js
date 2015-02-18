/**
 * Created by Ruslan_Dulina on 8/22/2014.
 */
(function () {
    'use strict';
    var processController = require('./../processor/processor'),
        configurationModule = require('./../processor/modules/processorconfiguration/iprocessorconfiguration'),
        url = require('url'),
        logger = require('./../logger/logger')(module),
        securitySettings = require('./../globalstorage').getStorage().securitySettings,
        security = require('./routersecurity'),
        Guid = require('guid'),
        cookies = require('./cookies'),
        MAX_ARCHIVE_LENGTH = 10000000;

    exports.sendAccessForbidden = function(response, message){
        configurationModule.sendAccessForbidden(response, message);
    };

    exports.sendValidationError = function (errors, response) {
        var guid = Guid.create();
        logger.warn(errors, {id: guid.value});
        configurationModule.sendValidationError(response, guid.value);
    };

    exports.sendNotFoundHtml = function (response, resourceName) {
        configurationModule.sendHtmlNotFound(response, resourceName);
    };

    exports.downloadArchive = function(response, widgetId){
        var controllerConfiguration = configurationModule.getWidgetConfiguration(response, 'application/zip');
        processController.getArchive(widgetId, controllerConfiguration);
    };

    exports.saveFileUpload = function (body, response, query) {
        var additional = {
            isCheck: true
        };

        var controllerConfiguration = configurationModule.uploadDeleteConfiguration(response, additional);
        query.clientId = query.organizationId;
        controllerConfiguration.query = query;
        controllerConfiguration.body = body;
        processController.sendToServiceUpload(controllerConfiguration);
        processController.unpackZip(controllerConfiguration);
    };

    exports.runSynchronization = function(){
        var controllerConfiguration = configurationModule.synchronizationConfiguration();
        processController.runSynchronization(controllerConfiguration);
    };

    exports.saveFileUpdate = function (body, response, query) {
        var additional = {
            isCheck: false
        };
        var controllerConfiguration = configurationModule.uploadDeleteConfiguration(response, additional);
        query.clientId = query.organizationId;
        controllerConfiguration.query = query;
        controllerConfiguration.body = body;
        processController.sendToServiceUpdate(controllerConfiguration);
        processController.unpackZip(controllerConfiguration);
    };

    exports.getData = function (request, response, callback) {
        var urlParts = url.parse(request.url, true), query = urlParts.query, that = this;
        response.setHeader('Cache-Control', 'no-cache');

        request.setEncoding('binary');
        var body = '';
        request.on('data', function (data) {
            body += data;
        });
        request.on('end', function () {
            if(body.length > MAX_ARCHIVE_LENGTH){
                var validationError = new Error('Archive size bigger then 10 Mb');
                that.sendValidationError(validationError, response);
            }
            else{
                callback(body, response, query);
            }
        });
        request.on('error', function (error) {
            var guid = Guid.create();
            logger.error(error, {id: guid.value});
            configurationModule.standardErrorCallback(response, guid.value);
        });
    };

    exports.getWidget = function (query, filename, response) {
        var controllerConfiguration = configurationModule.getWidgetConfiguration(response, 'text/html');
        processController.getWidget(controllerConfiguration, query, filename);
    };

    exports.getResource = function (uri, cookie, extension, response) {
        var controllerConfiguration = configurationModule.getWidgetConfiguration(response, extension);
        processController.getResource(controllerConfiguration, uri, cookie.userId, cookie.clientId);
    };

    exports.getViewerResource = function (filename, extension, response) {
        var controllerConfiguration = configurationModule.getWidgetConfiguration(response, extension);
        processController.getViewerResource(controllerConfiguration, filename);
    };

    exports.deleteWidget = function (request, response, userId, organizationId) {
        var widgetId = request.param('widgetId').toLowerCase();
        var controllerConfiguration = configurationModule.uploadDeleteConfiguration(response);
        processController.sendToServiceDelete(controllerConfiguration, widgetId, organizationId, userId);
        processController.deleteWidget(controllerConfiguration, widgetId, userId, organizationId);
    };

    exports.getCookieData = function (cookie) {
        var data = cookie.split('||');
        var result = {};
        result.userId = data[0].split('|')[2].toLowerCase();
        result.clientId = data[0].split('|')[0].toLowerCase();
        return result;
    };

    exports.saveCookie = function (request, response, userId, clientId) {
        var cookie = security.generateCookie(clientId, userId);
        cookies.set(response, request, 'vsessionid', cookie);
    };

    exports.checkCookie = function (request, response, callback) {
        var cookie = cookies.get('vsessionid', request);
        var isValid = security.checkCookie(cookie);
        if(isValid){
            callback(cookie);
        }
        else{
            logger.debug('Invalid cookie', cookie);
            configurationModule.sendUnauthorized(request, response);
        }
    };

    exports.checkBearerToken = function(request, response, params, callback){
        var isJson, parsedToken, message, userId, organizationId;
        parsedToken = security.parseToken(params.token);
        /**
         * if token type is identity we should return unauthorized answer in json format
         * if token type is not identity we should return unauthorized answer in html format
         * @type {boolean}
         */
        isJson = 'identity' === parsedToken.tokenBodyObj.sub;
        if (parsedToken) {
            userId = parsedToken.tokenBodyObj.aud.user;
            organizationId = parsedToken.tokenBodyObj.aud.organization;

            if (securitySettings.checkSignature && !security.isTokenSignatureValid(parsedToken)) {
                message = 'Invalid signature';
                logger.debug(message, parsedToken.tokenBodyObj.aud);
                configurationModule.sendUnauthorized(request, response, message, isJson);
                return;
            }
            if (securitySettings.checkExpiration && security.isTokenExpired(parsedToken)) {
                message = 'Token is expired.';
                logger.debug(message, parsedToken.tokenBodyObj.aud);
                configurationModule.sendUnauthorized(request, response, message, isJson);
                return;
            }
            if (security.isTokenRevoked(parsedToken)) {
                message = 'Token is revoked.';
                logger.debug(message, parsedToken.tokenBodyObj.aud);
                configurationModule.sendUnauthorized(request, response, message, isJson);
                return;
            }
            if (securitySettings.checkParent && !security.isTokenDomainsContainsParent(parsedToken, params.referer)) {
                message = 'Domains in token are not similar to parent domain.';
                logger.debug(message, parsedToken.tokenBodyObj.aud);
                configurationModule.sendUnauthorized(request, response, message, isJson);
                return;
            }

            if (securitySettings.checkSubject && !security.isTokenHaveValidSub(parsedToken, params.widgetId)) {
                message = 'Token have invalid subject.';
                logger.debug(message, parsedToken.tokenBodyObj.aud);
                configurationModule.sendUnauthorized(request, response, message, isJson);
                return;
            }

            callback(userId, organizationId);
        }
        else {
            message = 'Can\'t parse token. Invalid structure or token is empty' ;
            logger.debug(message, parsedToken.tokenBodyObj.aud);
            configurationModule.sendUnauthorized(request, response, message, isJson);
        }
    };

    exports.checkToken = function (request, response, widgetId, callback) {
        var token = request.param('token'), message, params = {};
        var referer = request.headers.referer;
        if (!token) {
            var tokenWithType = request.headers.authorization;
            if (tokenWithType) {
                token = tokenWithType.split(' ')[1];
            }
        }

        if (!token) {
            message = 'Token is missed.';
            configurationModule.sendUnauthorized(request, response, message);
            return;
        }

        params.token = token;
        params.widgetId = widgetId;
        params.referer = referer;

        this.checkBearerToken(request, response, params, callback);
    };
}());
