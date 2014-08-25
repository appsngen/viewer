/**
 * Created by Ruslan_Dulina on 8/7/2014.
 */

(function () {
    'use strict';
    var XmlProcessor = function (appFolder) {
        this.fileOperation = new (require('./filesystemprocessor')).FileSystem();
        this.xml2js = require('xml2js');
        this.winston = require('winston');
        this._ = require('underscore');
        this.logger = require('./logger')(module);
        this.appFolder = appFolder;
        this.parser = new this.xml2js.Parser();
    };

    XmlProcessor.prototype.parsePrefs = function (prefs) {

        var result = {}, parsedPref, that = this;

        if (Array.isArray(prefs)) {
            prefs.forEach(function (pref) {

                parsedPref = that.parsePref(pref);
                result[parsedPref['name']] = parsedPref['value'];
            });
        } else if (typeof prefs === 'object') {
            parsedPref = that.parsePref(prefs);
            result[parsedPref['name']] = parsedPref['value'];
        }

        return result;
    };

    XmlProcessor.prototype.parsePref = function (pref) {
        var value = {
            /* jshint camelcase: false */
            value: pref.$.default_value.toString(),
            /* jshint camelcase: true */
            type: pref.$.datatype ? pref.$.datatype.toUpperCase() : 'TEXT',
            possibleValues: []
        };

        if (pref.$.datatype === 'enum') {
            pref.EnumValue.forEach(function (enumValue) {
                value.possibleValues.push(enumValue.$.value.toString());
            });
        }
        return {
            name: pref.$.name,
            value: value
        };
    };

    XmlProcessor.prototype.parseBrowsers = function (result) {
        var xmlParsedBrowsers = [];
        if (result.Module.Metadata[0].SupportedBrowsers) {
            if (result.Module.Metadata[0].SupportedBrowsers.length !== 0) {
                var browsers = result.Module.Metadata[0].SupportedBrowsers[0].split('|');
                browsers.forEach(function (browser) {
                    var newBrowser = {
                        browser: browser.trim().split(' ')[0].toUpperCase(),
                        version: browser.trim().split(' ')[1] ? parseInt(browser.trim().split(' ')[1], 10) : 0
                    };

                    xmlParsedBrowsers.push(newBrowser);
                });
            }
        }

        return xmlParsedBrowsers;
    };

    XmlProcessor.prototype.processDatasources = function (result) {
        var xmlDatasorces = [];
        if (result.Module.Metadata[0].DataSources) {
            if (result.Module.Metadata[0].DataSources.length !== 0) {
                if (result.Module.Metadata[0].DataSources[0].Source) {
                    var sources = result.Module.Metadata[0].DataSources[0].Source;
                    sources.forEach(function (source) {
                        xmlDatasorces.push(source);
                    });
                }
            }
        }
        return xmlDatasorces;
    };

    XmlProcessor.prototype.processEvents = function (result) {
        var xmlParsedEventsPublish = [], xmlParsedEventsSubscribe = [], eventsResult;
        if (result.Module.Metadata[0].Events) {
            if (result.Module.Metadata[0].Events.length !== 0) {
                if (result.Module.Metadata[0].Events[0].Event) {
                    var events = result.Module.Metadata[0].Events[0].Event;
                    events.forEach(function (event) {
                        for (var name in event) {
                            if (event.hasOwnProperty(name)) {
                                if (name === 'Publish') {
                                    xmlParsedEventsPublish.push(event.Name);
                                }
                                if (name === 'Subscribe') {
                                    xmlParsedEventsSubscribe.push(event.Name);
                                }
                            }
                        }
                    });
                }
            }
        }
        eventsResult = {
            publish: xmlParsedEventsPublish,
            subscribe: xmlParsedEventsSubscribe
        };

        return eventsResult;
    };

    XmlProcessor.prototype.xmlParse = function (callback, errorCallback, query) {
        var filename = process.cwd() + this.appFolder + '/application.xml', parsedResult, that = this;
        that.fileOperation.readFile(filename, function(data){
            that.parser.parseString(data, function (error, result) {
                if (error) {
                    var message = 'Can not process Application.xml';
                    that.logger.error(message);
                    errorCallback(message);
                }
                else {
                    try {
                        parsedResult = {
                            appId: result.Module.ModulePrefs[0]['$'].id,
                            prefsSet: that.parsePrefs(result.Module.UserPref),
                            browsers: that.parseBrowsers(result),
                            dataSources: that.processDatasources(result),
                            events: that.processEvents(result),
                            width: parseInt(result.Module.ModulePrefs[0].$.width) || 600,
                            height: parseInt(result.Module.ModulePrefs[0].$.height) || 600,
                            applicationHtml: result.Module.Content[0].$.href
                        };
                    }
                    catch (exception){
                        that.logger.error(exception.message);
                        errorCallback(exception.message);
                    }

                    callback(parsedResult, query);
                }
            });
        }, errorCallback);
    };

    module.exports.XmlProcessor = XmlProcessor;
}());