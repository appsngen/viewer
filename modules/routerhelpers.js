/**
 * Created by Ruslan_Dulina on 8/22/2014.
 */
(function () {
    'use strict';
    var processControllerModule = require('./processor');
    var Cookies = require( "cookies");
    exports.errorCallback = function(error, code, response){
        if (!code) {
            code = 500;
        }
        this.sendResponse(response, JSON.stringify({message: error}), code, 'application/json');
    };

    exports.saveFile = function (body, response, query) {
        var data = new Date().getTime(), that = this;
        var path = 'out' + data + '/', zipName = 'widget' + data + '.zip';
        var processController = new processControllerModule.ProcessController('/' + path, zipName);
        var controllerConfiguration = {
            htmlBuildPath: '/' + path,
            isCopyCompiledWidget: true,
            compileWidgetPath: '/' + path,
            isCopyResources: true,
            resourceWidgetPath: '/widgetresources' + path,
            isChangeLocation: true,
            resourceName: 'Resources',
            tempFolder: '/' + path,
            errorCallback: function (error, code) {
                that.errorCallback(error, code, response);
            },
            successCallback: function (name, code, type, sendData) {
                var data, message = 'Widget ' + name + ' has been added successfully.';
                if (!code) {
                    code = 200;
                }
                if (!type) {
                    type = 'application/json';
                }
                if (type === 'application/json') {
                    data = JSON.stringify({message: message, name: name});
                }
                else {
                    data = sendData;
                }
                that.sendResponse(response, data, code, type);
            }
        };
        processController.init(controllerConfiguration);
        processController.saveZip(body, query);
    };

    exports.getWidget = function (query, filename, response) {
        var processController = new processControllerModule.ProcessController(), that = this;
        var controllerConfiguration = {
            isChangeLocation: false,
            errorCallback: function (error, code) {
                that.errorCallback(error, code, response);
            },
            globalSuccessCallback: function (code, type, sendData) {
                that.sendResponse(response, sendData, code, type);
            }
        };
        processController.init(controllerConfiguration);
        processController.getWidget(query, filename);
    };

    exports.getResource = function (uri, cookie, extension, response) {
        var processController = new processControllerModule.ProcessController(), that = this;
        var controllerConfiguration = {
            errorCallback: function (error, code) {
                that.errorCallback(error, code, response);
            },
            globalSuccessCallback: function (data) {
                that.sendResponse(response, data, 200, extension);
            }
        };
        processController.init(controllerConfiguration);
        processController.getResource(uri, cookie);
    };

    exports.getViewerResource = function (filename, extension, response) {
        var processController = new processControllerModule.ProcessController(), that = this;
        var controllerConfiguration = {
            errorCallback: function (error, code) {
                that.errorCallback(error, code, response);
            },
            globalSuccessCallback: function (data) {
                that.sendResponse(response, data, 200, extension);
            }
        };
        processController.init(controllerConfiguration);
        processController.getViwerResource(filename);
    };


    exports.sendResponse = function (response, message, code, contentType) {
        response.set('Content-Type', contentType);
        response.status(code).send(message);
    };

    exports.setCookie = function(userId, clientId, cookies){
        cookies.set("userClientId", userId);
        cookies.set("clientId", clientId);
    };

    exports.getCookie = function(request, response){
        var cookies = new Cookies(request, response);
        var result = {};
        result.userId = new Buffer(cookies.get('userClientId'), 'base64').toString('ascii');
        result.clientId = new Buffer(cookies.get('clientId'), 'base64').toString('ascii');
        return result;
    };

    exports.saveCookie = function(request, response){
        var cookies = new Cookies(request, response, {maxAge: 6000, httpOnly: true});
        var userId = new Buffer(request.param('userId')).toString('base64');
        var clientId = new Buffer(request.param('clientId')).toString('base64');

        if(!cookies.get('userClientId') || !cookies.get('clientId')){
            this.setCookie(userId, clientId, cookies);
        }
        else{
            if(cookies.get('userClientId') !== userId || cookies.get('clientId') !== clientId){
                this.setCookie(userId, clientId, cookies);
            }
        }
    };

}());