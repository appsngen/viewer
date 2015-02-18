/**
 * Created by Ruslan_Dulina on 9/22/2014.
 */

(function () {
    'use strict';

    var fs = require('fs');
    var NodeZip = require('node-zip');
    var JSONC = require('comment-json');
    var widgethtmltemlate = fs.readFileSync(__dirname + '/../src/templates/widgethtmltemlate.html').toString();
    var widgetheadconfiguration = fs.readFileSync(__dirname + '/../src/serverconfig.json');
    var cert = fs.readFileSync(__dirname + '/../configuration/appsngen_token_public.crt');
    module.exports.tokenHeader = new Buffer(JSON.stringify({
        'alg':'SHA1withRSA',
        'cty':'json',
        'x5t':'aMYcVcuoLJ76vNqapkAqH45n6bA=',
        'typ':'JOSE'
    })).toString('base64');
    module.exports.tokenHeaderWithoutAlgorithm = new Buffer(JSON.stringify({
        'alg':'',
        'cty':'json',
        'x5t':'aMYcVcuoLJ76vNqapkAqH45n6bA=',
        'typ':'JOSE'
    })).toString('base64');
    module.exports.tokenBodyOriginal = new Buffer(JSON.stringify({
        'iss':'appsngen',
        'aud':{
            'organization':null,
            'userRoles':[],
            'user':'urn:org:top_investing'
        },
        'sub':'stream:activ dataSource:epam_systems.mashupengine dataSource:tr.symbolinfo',
        'jti':'fc26d530-13bf-4879-ba73-6930e6734efe',
        'exp':1414579853173,
        'iat':1411987853173,
        'typ':'at'
    })).toString('base64');
    module.exports.tokenBody = new Buffer(JSON.stringify({
        'iss':'appsngen',
        'aud':{
            'organization':'epam_systems',
            'userRoles':[],
            'user':'dev1@epamsystems.com',
            'domains':['local.appsngen.com']
        },
        'sub':'widget:urn:app:epam_systems:index_chart',
        'jti':'fc26d530-13bf-4879-ba73-6930e6734efe',
        'exp':9991414579853173,
        'iat':1411987853173,
        'typ':'at'
    })).toString('base64');
    module.exports.tokenBodyPost = new Buffer(JSON.stringify({
        'iss':'appsngen',
        'aud':{
            'organization':'urn:org:epam_systems',
            'userRoles':[],
            'user':'dev1@epamsystems.com',
            'domains':['local.appsngen.com']
        },
        'sub':'identity',
        'jti':'fc26d530-13bf-4879-ba73-6930e6734efe',
        'exp':1414579853173,
        'iat':1411987853173,
        'typ':'at'
    })).toString('base64');
    module.exports.tokenBodyExpired = new Buffer(JSON.stringify({
        'iss':'appsngen',
        'aud':{
            'organization':null,
            'userRoles':[],
            'user':'urn:org:top_investing',
            'domains':['local.appsngen.com']
        },
        'sub':'widgetId',
        'jti':'fc26d530-13bf-4879-ba73-6930e6734efe',
        'exp':141457,
        'iat':1411987,
        'typ':'at'
    })).toString('base64');
    module.exports.tokenBodyWithoutWidgetId = new Buffer(JSON.stringify({
        'iss':'appsngen',
        'aud':{
            'organization':null,
            'userRoles':[],
            'user':'urn:org:top_investing',
            'domains':['local.appsngen.com']
        },
        'sub':'widgetId',
        'jti':'fc26d530-13bf-4879-ba73-6930e6734efe',
        'exp':141457,
        'iat':1411987,
        'typ':'at'
    })).toString('base64');
    module.exports.tokenSignature = 'RUMP/OxVcG+X53TMKQp0QKYhC4yhWddxWmLDZ9ju8jVSvOVvNHFmhElost4db8bAeoKxuQW1qL8Xbiqu' +
        'ZplH2g2IvL5kd0T1J2eEvbJL1jeI6syAWtkqE/SAoQxj0ScxZ3D5HY+1xbQ4MUBfLOCCcw4tWKCbSe8q5lD5iJHASPg=';
    module.exports.tokenInvalidSignature = 'RUMP/OxVcG+X53TMKQp0QKYhC4yhWddxWmLDZ9ju8jVSvOVvNHFmhElost4db8bAeoKxuQW1q' +
        'ZplH2g2IvL5kd0T1J2eEvbJL1jeI6syAWtkqE/SAoQxj0ScxZ3D5HY+1xbQ4MUBfLOCCcw4tWKCbSe8q5lD5iJHASPg=';
    module.exports.token =  module.exports.tokenHeader + '.' + module.exports.tokenBody + '.' +
        module.exports.tokenSignature;
    module.exports.tokenExpired =  module.exports.tokenHeader + '.' + module.exports.tokenBodyExpired + '.' +
        module.exports.tokenSignature;
    module.exports.loggerStub = function () {
        var logger = {
            error: function () {
            }
        };

        return logger;
    };
    module.exports.routerhelpers = {
        error: '',
        message: '',
        widgetId: '',
        sendValidationError: function (error) {
            this.error = error;
        },
        sendAccessForbidden: function (response, message) {
            this.message = message;
        },
        downloadArchive: function (response, widgetId) {
            this.widgetId = widgetId;
        }
    };
    module.exports.stubRepository = {

    };
    module.exports.stubDatabaseProvider = {

    };
    module.exports.mySqlStub = {

    };
    module.exports.restServicesRequesterStub = {
        getToken: function (xml, userId, callback) {
            callback('testToken', 123);
        }
    };
    var storageObject = {
        baseUrl: 'http://google.com/viewer',
        expirationTokenTime: 123,
        databaseConfiguration: {
            host     : '',
            user     : '',
            password : '',
            port     : ''
        },
        cache: {
            tokens: {
                'userId.widgetId': module.exports.token,
                'userId.widgetIdexp': 1234567891011111,
                'userIdExpired.widgetId': module.exports.tokenExpired,
                'userIdExpired.widgetIdexp': 123,
                'userIdNew.widgetIdNew' : 'oldToken',
                'userIdNew.widgetIdNewexp' : 2,
                'userIdExpired1.widgetId1': module.exports.tokenExpired,
                'userIdExpired1.widgetId1exp': 123
            },
            compiledWidgetCache: {
                'widgetId.filePath.organizationId': 'compiledData'
            }
        },
        'staticFiles':{
            'applicationWeb':{
                'authToken': '',
                'appstore.api': {
                    'timestamp': '',
                    'unsupportedBrowserUrl': '/content/index.html',
                    'datasourceProxyUrl': 'https://local.appsngen.com/datasource-proxy',
                    'activProxyWebSocketUrl': 'wss://local.appsngen.com/activ-data-proxy',
                    'ieDataProxy': 'https://local.appsngen.com/datasource-proxy/ie-data-proxy'
                },
                'core.util': {
                    'appstore.events': {
                        'events': {
                            'publish': [],
                            'subscribe': []
                        }
                    },
                    'core': {},
                    'appstore.api': {}
                }
            }
        }
    };
    module.exports.globalStorage = {
        getStorage: function () {
            return storageObject;
        }
    };
    module.exports.stubViewerPublisher = {

    };

    module.exports.testData = {};
    module.exports.cache = {
        getOriginZip: function(){
            var zip = new NodeZip();
            zip.file('test.txt', 'test data');
            return zip;
        },

        getTemplateHtml: function () {
            return widgethtmltemlate;
        },
        getWidgetJsonTemplate: function () {
            var result = widgetheadconfiguration;
            return JSONC.parse(result).widgetConfig;
        },
        getCache: function () {
            return {
                id: 123,
                baseUrl: 'https://local.appsngen.com/viewer'
            };
        },
        getCertificate:function(){
            return cert;
        },
        setCompiledResource: function (params, data, time) {
            module.exports.testData.params = params;
            module.exports.testData.data = data;
            module.exports.testData.time = time;
        },
        getCookieKey: function(){
            return 'B1ixPacL6Pp2P8pvbYiy4t1qL0GWJ6IsEWc7wsikYcf6tzUzpsbvUOXWPiMFfJOg';
        }
    };
    module.exports.widgetCache = {
        getXml: function () {
            return 'xml';
        }
    };
    module.exports.renderedtemplate = fs.readFileSync(__dirname + '/content/renderedtemplate.html');
    module.exports.xmlString = fs.readFileSync(__dirname + '/content/widgetxmltest.xml').toString();
    module.exports.widgetHtml = fs.readFileSync(__dirname + '/content/widgettest.html');
    module.exports.widgetRenderedHtml = fs.readFileSync(__dirname + '/content/renderedtemplate.html');
    module.exports.resultHtml = fs.readFileSync(__dirname + '/content/compiledwidget.html').toString();
    module.exports.requestedHtml = fs.readFileSync(__dirname + '/content/requestedwidget.html').toString();
    module.exports.less = fs.readFileSync(__dirname + '/content/testless.less').toString();
    module.exports.cssResult = fs.readFileSync(__dirname + '/content/testcss.css').toString();
    module.exports.uri = 'organizations/top_investing/widgets/global_preferences_demo' +
        '/index.html?container=default&mid=0&nocache=0&country=ALL&lang=ALL&view=canvas&debug=0&application=' +
        'urn%3Aapp%3Atop_investing%3Aglobal_preferences_demo&clientId=urn%3Aorg%3Atop_investing&parent=' +
        'https%3A%2F%2Flocal.appsngen.com&integrationType=developer&userId=demo%40appsngen.com&nonce=' +
        '8427553989998186761&timestamp=1411374197503&signature=ndJ5f%2FZS6aDMwv0PNL6i18rFl7E%3D&frameId=' +
        'Global_Preferences_Demo';
    module.exports.resourceUrl = '/organizations/urn:org:top_investing/widgets/urn:app:top_investing:' +
        'global_preferences_demo/css/preferences-styles.less';
}());
