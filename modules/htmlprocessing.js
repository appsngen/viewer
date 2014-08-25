/**
 * Created by Ruslan_Dulina on 8/11/2014.
 */

(function () {
    'use strict';
    var HtmlBuilder = function (lessBuilder) {
        this.winston = require('winston');
        this.htmlparser = require('htmlparser');
        this.htmlConstructor = require('htmlparser-to-html');
        this._ = require('underscore');
        this.select = require('soupselect').select;
        this.lessFiles = [];
        this.lessBuilder = lessBuilder;
        this.fileOperation = new (require('./filesystemprocessor')).FileSystem();
        this.templateScripts = [];
        this.logger = require('./logger')(module);
    };

    HtmlBuilder.prototype.createTemplateHtml = function (xmlResult, filename, callback, errorCallback) {
        var config, that = this, dom;

        that.fileOperation.readFile(filename, function(dataTemplate){
            that.fileOperation.readFile(process.cwd() + '/configuration/web.json', function(jsonString){
                config = JSON.parse(jsonString);
                config['shindig.auth'].authToken = xmlResult.token;
                config['core.util']['appstore.events'].events.publish = xmlResult.events.publish;
                config['core.util']['appstore.events'].events.subscribe = xmlResult.events.subscribe;
                var result = that._.template(dataTemplate.toString())({
                    config : config,
                    browsers : xmlResult.browsers,
                    prefs : xmlResult.prefsSet
                });
                dom = that.createDom(result, errorCallback);
                if(!dom){
                    errorCallback();
                }
                else{
                    callback(dom);
                }
            },errorCallback);
        },errorCallback);
    };

    HtmlBuilder.prototype.createDom =function(rawHtml){
        var that = this;
        var handler = new this.htmlparser.DefaultHandler(function (error) {
            if (error) {
                var message = 'Can not parse html. Html is not valid;';
                that.logger.error(message);
            }
        });
        var parser = new that.htmlparser.Parser(handler);

        parser.parseComplete(rawHtml);

        return handler.dom;
    };

    HtmlBuilder.prototype.insertData = function(dom, templateDom){
        var that = this, i, result = {};
        result.isValid = false;
        try {
            that.select(templateDom, 'script').forEach(function (element) {
                that.templateScripts.push(element);
            });

            that.select(dom, 'body')[0].children.push({data: '\r\n\t', raw: '\r\n\t', type: 'text'});
            that.select(dom, 'body')[0].children.push(that.templateScripts[that.templateScripts.length - 1]);
            that.select(dom, 'body')[0].children.push({data: '\r\n', raw: '\r\n', type: 'text'});
            for (i = 0; i < 6; i++) {
                that.select(dom, 'head')[0].children.unshift(that.templateScripts[5 - i]);
                that.select(dom, 'head')[0].children.unshift({data: '\r\n\t', raw: '\r\n\t', type: 'text'});
            }

            that.select(dom, 'head')[0].children.push({data: '\r\n\t', raw: '\r\n\t', type: 'text'});
            that.select(dom, 'head')[0].children.push(that.templateScripts[6]);
            result.isValid = true;
            result.dom = dom;
        }
        catch(exception){
            var message = 'Can not parse html. Html is not valid;';
            that.logger.error(message);
            return result;
        }

        return result;
    };

    HtmlBuilder.prototype.applyGlobalPreferences = function (organizationPreferences, defaultPreferences) {
        var property;
        for(property in organizationPreferences){
            if(organizationPreferences.hasOwnProperty(property)){
                if(defaultPreferences[property] !== undefined){
                    defaultPreferences[property].value = organizationPreferences[property];
                }
            }
        }

        return defaultPreferences;
    };

    HtmlBuilder.prototype.validURL = function(str) {
        var pattern = new RegExp('https?:\/\/');
        return pattern.test(str);
    };

    HtmlBuilder.prototype.buildTemplate = function (xmlResult, widgetPath, callback, errorCallback) {
        var that = this, dom, templateDom, result, pathSaving ='';
        xmlResult.prefsSet= that.applyGlobalPreferences(xmlResult.organizationPreferences, xmlResult.prefsSet);
        that.createTemplateHtml(xmlResult, process.cwd() + '/content/template.html',function(templateDomResponse) {
            templateDom = templateDomResponse;
            that.fileOperation.readFile(widgetPath + xmlResult.applicationHtml, function (rawHtml) {
                dom = that.createDom(rawHtml);

                that.select(dom, 'link').forEach(function (element) {
                    if(!that.validURL(element.attribs.href.toString())){
                        that.lessFiles.push(widgetPath + element.attribs.href);
                    }
                });

                that.lessBuilder.compileLess(that.lessFiles,xmlResult.organizationPreferences, function(){
                    result = that.insertData(dom, templateDom);
                    if(result.isValid){
                        var newHtml = that.htmlConstructor(dom);

                        pathSaving = widgetPath + xmlResult.applicationHtml;

                        that.fileOperation.writeFile(pathSaving, newHtml, function(){
                            callback(xmlResult);
                        }, errorCallback);
                    }
                    else{
                        errorCallback();
                    }
                }, errorCallback);

            }, errorCallback);
        }, errorCallback);
    };

    module.exports.HtmlBuilder = HtmlBuilder;
}(this));