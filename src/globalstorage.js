/**
 * Created by Ruslan_Dulina on 9/22/2014.
 */
(function () {
    'use strict';
    var repository = require('./dataproviders/repositories/widgetsfilesystemrepository');
    var _ = require('underscore');
    _.templateSettings = {
        evaluate    : /<%%([\s\S]+?)%%>/g,
        interpolate : /<%%=([\s\S]+?)%%>/g,
        escape      : /<%%-([\s\S]+?)%%>/g
    };
    var mime = require('mime');
    var storage = {}, options;
    module.exports.getStorage = function () {
        if(!storage.VIEWER){
            storage.VIEWER = {};
            storage.VIEWER.staticFiles = {};
            storage.VIEWER.cache = {};
            storage.VIEWER.cache.tokens = {};
            storage.VIEWER.cache.widgetCache = {};
            storage.VIEWER.cache.organizationPreferencesCache = {};
            storage.VIEWER.cache.widgetPreferencesCache = {};
            storage.VIEWER.cache.compiledWidgetCache = {};
        }
        return storage.VIEWER;
    };

    module.exports.setStorage = function(parsedData){
        var tempData, html;
        storage.VIEWER.id = new Date().getTime();
        storage.VIEWER.portHttp = parsedData.viewerInstanceConfiguration.portHttp;
        storage.VIEWER.portHttps = parsedData.viewerInstanceConfiguration.portHttps;
        storage.VIEWER.host = parsedData.viewerInstanceConfiguration.host;
        storage.VIEWER.version = parsedData.viewerInstanceConfiguration.version;
        storage.VIEWER.baseUrl = parsedData.viewerInstanceConfiguration.baseUrl;

        tempData = repository.readFileSync(parsedData.staticFiles.htmlTemplatePath);
        storage.VIEWER.staticFiles.htmlTemplate = tempData;
        tempData = repository.readFileSync(parsedData.staticFiles.applicationAnaliticPath);
        storage.VIEWER.staticFiles['applications.analytics.js'] = tempData;

        tempData = repository.readFileSync(parsedData.staticFiles.appsngenWidgetApiPath);
        storage.VIEWER.staticFiles['appsngen.widget.api.js'] = _.template(tempData.toString())({
            viewerUrl: storage.VIEWER.baseUrl
        });

        tempData = repository.readFileSync(parsedData.staticFiles.appsngenContainerApiPath);
        storage.VIEWER.staticFiles['appsngen.container.api.js'] = _.template(tempData.toString())({
            viewerUrl: storage.VIEWER.baseUrl
        });
        tempData = repository.readDirSync(parsedData.staticFiles.imagesViewsPath);
        tempData.forEach(function(file){
            storage.VIEWER.staticFiles[file] = repository.readFileSync(parsedData.staticFiles.imagesViewsPath + file);
        });
        tempData = repository.readDirSync(parsedData.staticFiles.viewsPath);
        tempData.forEach(function(file){
            if(mime.lookup(file) === 'text/html'){
                html = repository.readFileSync(parsedData.staticFiles.viewsPath + file);
                storage.VIEWER.staticFiles[file] = _.template(html.toString())({
                    baseUrl: storage.VIEWER.baseUrl,
                    id: '<%%=id%%>',
                    message: '<%%=message%%>',
                    resource: '<%%=resource%%>'
                });
            }
        });

        storage.VIEWER.staticFiles.applicationWeb = parsedData.widgetConfig;
        tempData = repository.readFileSync(parsedData.staticFiles.appsngenCertificate);
        storage.VIEWER.staticFiles.appsngenCertificate = tempData;
        tempData = repository.readFileSync(parsedData.staticFiles.liquibaseTemplatePath);
        storage.VIEWER.staticFiles.liqubaseTemplate = tempData;
        storage.VIEWER.staticFiles.mysqlConnectorJavaPath = parsedData.staticFiles.mysqlConnectorJavaPath;
        storage.VIEWER.staticFiles.changeLogFilePath = parsedData.staticFiles.changeLogFilePath;

        storage.VIEWER.secretsPath = parsedData.secretsPath;
        storage.VIEWER.expirationTokenTime = parsedData.expirationTokenTime;
        storage.VIEWER.appsngenCookieKey = parsedData.appsngenCookieKey;
        storage.VIEWER.restserviceConfig = parsedData.restServicesConfiguration;
        storage.VIEWER.databaseConfiguration = parsedData.databaseConfiguration;
        storage.VIEWER.rabbitMqConfiguration = parsedData.rabbitMqConfiguration;

        storage.VIEWER.securitySettings = parsedData.securitySettings;
        storage.VIEWER.graylog = parsedData.graylog;
        storage.VIEWER.masterToken = parsedData.masterToken;
        storage.VIEWER.services = parsedData.services;
        storage.VIEWER.serviceUser = parsedData.serviceUser;
        storage.VIEWER.user = parsedData.user;
        storage.VIEWER.dataProvider = parsedData.dataProvider;
        if(parsedData.httpsConfiguration.pem && parsedData.httpsConfiguration.crt){
            options = {
                key: repository.readFileSync(parsedData.httpsConfiguration.pem),
                cert: repository.readFileSync(parsedData.httpsConfiguration.crt)
            };
        }
        storage.VIEWER.httpsOption = options;
    };
}());
