/**
 * Created by Ruslan_Dulina on 8/18/2014.
 */

(function () {
    'use strict';
    var url = require('url'), path = require('path'),
        processControllerModule = require('./processor'),
        logger = require('./logger')(module),
        util = require('util'),
        helper = require('./routerhelpers'),
        mime = require('mime');
    mime.types['less'] = mime.types['css'];

    exports.login = function(request, response){
        var processController = new processControllerModule.ProcessController();
        var controllerConfiguration = {
            errorCallback: function (error, code) {
                if (!code) {
                    code = 500;
                }
                helper.sendResponse(response, JSON.stringify({message: error}), code, 'application/json');
            },
            globalSuccessCallback: function () {
                response.status(200).send({message: 'success'});
            }
        };
        processController.init(controllerConfiguration);
        processController.saveCredentials(request.body);
    };

    exports.upload = function (request, response) {
        response.setHeader('Cache-Control', 'no-cache');
        var urlParts = url.parse(request.url, true),
            query = urlParts.query;
        request.checkQuery('organizationId', 'Invalid organization Id.').notEmpty();
        request.checkQuery('userId', 'Invalid user id.').notEmpty();

        var errors = request.validationErrors();
        if (errors) {
            response.status(400).send('There have been validation errors: ' + util.inspect(errors));
            return;
        }

        request.setEncoding('binary');
        var body = '';
        request.on('data', function (data) {
            body += data;
        });
        request.on('end', function () {
            helper.saveFile(body, response, query);
        });
        request.on('error', function (error) {
            logger.error(error.message);
            helper.sendResponse(response, JSON.stringify({message: error.message}), 500, 'application/json');
        });

    };

    exports.getWidget = function (request, response) {
        var uri = url.parse(request.url).pathname,
            urlParts = url.parse(request.url, true),
            filename = path.join(__dirname + '/../', uri),
            query = urlParts.query;
        request.checkParams('organizationId', 'Invalid organization Id.').notEmpty();
        request.checkParams('widgetId', 'Invalid widget Id.').notEmpty();
        request.checkQuery('clientId', 'Invalid client id.').notEmpty();
        request.checkQuery('parent', 'Invalid parent.').notEmpty();
        request.checkQuery('integrationType', 'Invalid integration type.').notEmpty();
        request.checkQuery('userId', 'Invalid user id.').notEmpty();
        request.checkQuery('frameId', 'Invalid frame id.').notEmpty();

        var errors = request.validationErrors();
        if (errors) {
            response.status(400).send('There have been validation errors: ' + util.inspect(errors));
            return;
        }
        helper.saveCookie(request, response);

        helper.getWidget(query, filename, response);
    };

    exports.getWidgetResources = function (request, response) {
        var uri = url.parse(request.url).pathname,
            filename = path.join(__dirname + '/../', uri),
            extension = mime.lookup(filename);
        var cookie = helper.getCookie(request, response);
        helper.getResource(uri, cookie, extension, response);

    };

    exports.getViewerResources = function (request, response) {
        var uri = url.parse(request.url).pathname,
            filename = path.basename(uri),
            extension = mime.lookup(filename);
        if (extension) {
            helper.getViewerResource(filename, extension, response);
        }
    };

    exports.unhandled = function (request, response) {
        response.status(404).send();
    };

    exports.authorization = function (request, response, next) {
        next();
    };
}());