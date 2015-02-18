/**
 * Created by Ruslan_Dulina on 8/18/2014.
 */

(function () {
    'use strict';
    var url = require('url'), path = require('path'),
        storage = require('./../globalstorage').getStorage(),
        util = require('util'),
        helper = require('./routerhelpers'),
        mime = require('mime');
    mime.types['less'] = mime.types['css'];

    exports.ping = function (request, response) {
        response.status(200);
        response.render('routersStructure.html', { baseUrl: storage.baseUrl});
    };

    exports.heartbeat = function (request, response) {
        var timeNow = new Date();
        response.set('Content-Type', 'text/plain');
        response.status(200).send(timeNow.getTime().toString());
    };

    exports.synchronize = function(){
        helper.runSynchronization();
    };

    exports.upload = function (request, response) {
        helper.getData(request, response, function (body, response, query) {
            query.userId = request.userId;
            query.organizationId = request.organizationId;

            helper.saveFileUpload(body, response, query);
        });
    };

    exports.update = function (request, response) {
        helper.getData(request, response, function (body, response, query) {
            query.userId = request.userId;
            query.organizationId = request.organizationId;

            helper.saveFileUpdate(body, response, query);
        });
    };

    exports.getWidget = function (request, response) {
        var filename = url.parse(request.url).pathname,
            urlParts = url.parse(request.url, true),
            query = urlParts.query;
        query.userId = request.userId;
        query.clientId = request.organizationId;
        request.checkParams('organizationId', 'Invalid organization Id.').notEmpty();
        request.checkParams('widgetId', 'Invalid widget Id.').notEmpty();

        /**
         * disable frame if check
         * frame id is not added to frame after applying global preferences.
         */
        //request.checkQuery('frameId', 'Invalid frame id.').notEmpty();

        var errors = request.validationErrors();
        if (errors) {
            helper.sendValidationError(util.inspect(errors), response);
        }
        else {
            helper.saveCookie(request, response, query.userId, query.clientId);
            helper.getWidget(query, filename, response);
        }
    };

    exports.getWidgetResources = function (request, response) {
        helper.checkCookie(request, response, function (cookie) {
            var filename = url.parse(request.url).pathname, extension = mime.lookup(filename);
            var cookieData = helper.getCookieData(cookie);
            helper.getResource(filename, cookieData, extension, response);
        });
    };

    exports.getViewerResources = function (request, response) {
        var uri = url.parse(request.url).pathname,
            filename = path.basename(uri),
            extension = mime.lookup(filename);
        helper.getViewerResource(filename, extension, response);
    };

    exports.preconditionCheck = function (request, response, next) {
        request.checkParams('widgetId', 'Invalid widget Id.').notEmpty();
        var errors = request.validationErrors();
        if (errors) {
            helper.sendValidationError(util.inspect(errors), response);
            return;
        }
        var widgetId = request.param('widgetId');
        var organizationId = request.organizationId;
        /**
         * Check that organization from widgetId equals to organization from request
         * 'urn:app:epam_systems:index_chart'.split(':')[2] === 'urn:org:epam_systems'.split(':')[2]
         */
        if (widgetId && organizationId && widgetId.split(':')[2] === organizationId.split(':')[2]) {
            next();
        }
        else {
            var message = 'Widget: ' + widgetId + ' not belong to organization: ' + organizationId;
            helper.sendAccessForbidden(response, message);
        }
    };

    exports.downloadArchive = function (request, response) {
        var widgetId = request.param('widgetId');
        response.setHeader('Content-Disposition', 'attachment;filename=' + widgetId.split(':')[3] + '.zip');
        request.setEncoding('binary');
        helper.downloadArchive(response, widgetId);
    };

    exports.deleteWidget = function (request, response) {
        var userId = request.userId;
        var organizationId = request.organizationId;
        helper.deleteWidget(request, response, userId, organizationId);
    };

    exports.authorization = function (request, response, next) {
        var widgetId = request.param('widgetId');
        helper.checkToken(request, response, widgetId, function (userId, organizationId) {
            request.userId = userId.toLowerCase();
            request.organizationId = organizationId.toLowerCase();
            next();
        });
    };

    exports.unhandled = function (request, response) {
        helper.sendNotFoundHtml(response, request.url);
    };
}());