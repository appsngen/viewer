/**
 * Created by Ruslan_Dulina on 8/15/2014.
 */

(function () {
    'use strict';
    var lessProcessorModule =  require('./lessprocessing'),
        zipProcessorModule = require('./zipprocessing'),
        xmlProcessorModule = require('./xmlprocessing'),
        restServicesRequesterModule = require('./restservicesrequester'),
        htmlProcessorModule = require('./htmlprocessing'),
        widgetProcessor = require('./widgetprocessing');
    var ProcessController = function (path, zipName) {
        this.lessProcessor = new lessProcessorModule.LessBuilder();
        this.zipProcessor = new zipProcessorModule.ZipProcessor(zipName);
        this.xmlProcessor = new xmlProcessorModule.XmlProcessor(path);
        this.servicesRequester = new restServicesRequesterModule.RestServicesRequester();
        this.htmlProcessor = new htmlProcessorModule.HtmlBuilder(this.lessProcessor);
        this.widgetProcessor = new widgetProcessor.WidgetProcessor();
    };

    ProcessController.prototype.init = function(config){
        this.config = config;
    };


    ProcessController.prototype.saveCredentials = function(credentials){
        var config = this.config;
        this.servicesRequester.saveSecrets(credentials, config.globalSuccessCallback, config.errorCallback);
    };

    ProcessController.prototype.getViwerResource = function(filename){
        var config = this.config;
        this.widgetProcessor.getAdditionalResource(filename, config.globalSuccessCallback);
    };

    ProcessController.prototype.ProcessHtml = function(xmlResult){
        var that = this, htmlPath = __dirname + '/../' + that.config.htmlBuildPath,
            relocationConfig = {source : '', destination:''},
            config = that.config;
        var changeLocation = function(xmlResult){
            if(config.isCopyCompiledWidget && config.isCopyResources){
                relocationConfig.destination = '';
                relocationConfig.source = config.compileWidgetPath;
                that.zipProcessor.changeLocation(xmlResult, relocationConfig, function(){
                    relocationConfig.destination = config.resourceName;
                    relocationConfig.source = config.resourceWidgetPath;
                    that.zipProcessor.changeLocation(xmlResult, relocationConfig, function(name){
                        config.successCallback(name);
                    },config.errorCallback);
                },config.errorCallback);
            }
            if(!config.isCopyCompiledWidget && config.isCopyResources){
                relocationConfig.destination = config.resourceName;
                relocationConfig.source = config.resourceWidgetPath;
                that.zipProcessor.changeLocation(xmlResult, relocationConfig, function(name){
                    config.successCallback(name);
                },config.errorCallback);
            }
            if(config.isCopyCompiledWidget && !config.isCopyResources){
                relocationConfig.destination = '';
                relocationConfig.source = config.compileWidgetPath;
                that.zipProcessor.changeLocation(xmlResult, relocationConfig, function(name){
                    config.successCallback(name);
                },config.errorCallback);
            }
        };
        if(that.config.isChangeLocation){
            that.htmlProcessor.buildTemplate(xmlResult, htmlPath, changeLocation ,config.errorCallback);
        }else{
            that.htmlProcessor.buildTemplate(xmlResult, htmlPath, config.successCallback, config.errorCallback);
        }
    };

    ProcessController.prototype.GetPreferences = function(xmlResult){
        var that = this;
        that.servicesRequester.getPreferences(xmlResult, that.ProcessHtml.bind(that), that.config.errorCallback);
    };

    ProcessController.prototype.RestServicesCallToken = function(xmlResult, query){
        var that = this, config = this.config;
        that.servicesRequester.getToken(query, xmlResult, that.GetPreferences.bind(that), config.errorCallback);
    };

    ProcessController.prototype.validateXml= function(query){
        var that = this;
        that.xmlProcessor.xmlParse(that.RestServicesCallToken.bind(that), that.config.errorCallback, query);
    };

    ProcessController.prototype.saveZip = function(body, query){
        var that = this, config = this.config;
        this.zipProcessor.saveZipFile(body, query, function(query){
            that.zipProcessor.unzipFile(query, config.tempFolder, that.validateXml.bind(that), config.errorCallback);
        }, that.config.errorCallback);
    };
    ProcessController.prototype.getWidget = function(query, filename) {
        var that = this, reqInfo = {query: query, filename: filename};
        that.widgetProcessor.getHtml(reqInfo, function (html) {
            that.config.globalSuccessCallback(200, 'text/html', html);
        },function(xmlResult, query, path){
            that.config.htmlBuildPath = path;
            that.config.successCallback = function(){
                that.widgetProcessor.getHtml(query, filename, function (html) {
                    that.config.globalSuccessCallback(200, 'text/html', html);
                }, that.config.errorCallback);
            };
            that.RestServicesCallToken(xmlResult, query);
        }, that.config.errorCallback);
    };

    ProcessController.prototype.getResource = function(uri, cookie){
        var that = this;
        that.widgetProcessor.getResource(uri, cookie, function(data){
            that.config.globalSuccessCallback(data);
        }, that.config.errorCallback);
    };

    module.exports.ProcessController = ProcessController;

}());