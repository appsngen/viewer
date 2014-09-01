/**
 * Created by Ruslan_Dulina on 8/29/2014.
 */

(function () {
    'use strict';
    var filesystem = new (require('./filesystemprocessor')).FileSystem(),
        portscanner = require('portscanner'), tempData;
    exports.readServerConfig = function (callback) {
        var filename = __dirname + '/../serverConfig.json';
        filesystem.readFile(filename, function (data) {
            try {
                var parsedData = JSON.parse(data);
                global.viwerConfig = {};
                global.viwerConfig.viewerPort = parsedData.viewerPort;
                global.viwerConfig.viewerHost = parsedData.viewerHost;
                global.viwerConfig.htmlTemplate = filesystem.readFileSync(__dirname + parsedData.htmlTemplatePath);
                tempData = filesystem.readFileSync(__dirname + parsedData.applicationAnaliticPath);
                global.viwerConfig['applications.analytics.js'] = tempData;
                tempData = filesystem.readFileSync(__dirname + parsedData.appstoreApiApplicationPath);
                global.viwerConfig['appstore.api.application.js'] = tempData;
                tempData = filesystem.readFileSync(__dirname + parsedData.appstoreApiContainerPath);
                global.viwerConfig['appstore.api.container.js'] = tempData;
                tempData = filesystem.readFileSync(__dirname + parsedData.stubgadgetPath);
                global.viwerConfig['stubgadget.js'] = tempData;
                tempData = JSON.parse(filesystem.readFileSync(__dirname + parsedData.restserviceConfigPath));
                global.viwerConfig.restserviceConfig = tempData;
                tempData = JSON.parse(filesystem.readFileSync(__dirname + parsedData.applicationWebPath));
                global.viwerConfig.applicationWeb = tempData;
                portscanner.checkPortStatus(parsedData.viewerPort, parsedData.viewerHost, function (error, status) {
                    callback(parsedData.viewerPort, status);
                });
            } catch (ex) {
                throw 'Unable parsed server config.';
            }
        }, function () {
            throw 'Unable read server config.';
        });
    };
}());