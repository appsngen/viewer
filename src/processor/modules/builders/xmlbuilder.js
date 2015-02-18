/**
 * Created by Ruslan_Dulina on 8/7/2014.
 */

(function () {
    'use strict';
    var repository = require('./../../../dataproviders/iprovider');
    var xml2js = require('xml2js');
    var logger = require('./../../../logger/logger')(module);
    var parser = new xml2js.Parser();
    var Guid = require('guid');
    
    exports.parsePrefs = function (prefs, isExtended) {

        var result = {}, parsedPref, that = this;

        if (Array.isArray(prefs)) {
            prefs.forEach(function (pref) {

                parsedPref = that.parsePref(pref, isExtended);
                result[parsedPref['name']] = parsedPref['value'];
            });
        } else if (typeof prefs === 'object') {
            parsedPref = that.parsePref(prefs, isExtended);
            result[parsedPref['name']] = parsedPref['value'];
        }

        return result;
    };

    exports.parsePref = function (pref, isExtended) {
        /**
         * It can be empty { '' } or null
         */
        /* jshint camelcase: false */
        if (pref.$.default_value !== undefined) {
            var value = {
                value: pref.$.default_value.toString(),
                /* jshint camelcase: true */
                type: pref.$.datatype ? pref.$.datatype.toUpperCase() : 'TEXT',
                possibleValues: []
            };
            if(isExtended) {
                /**
                 * Optional parameters
                 */
                /* jshint camelcase: false */
                value.displayName = pref.$.display_name ? pref.$.display_name.toString() : '';
                value.preferenceType = pref.$.pref_type ? pref.$.pref_type.toString() : 'Settings';
                value.description = pref.$.description ? pref.$.description.toString() : '';
                value.required = pref.$.required ? JSON.parse(pref.$.required) : false;
                /**
                 * Optional parameters
                 */
                if (pref.$.group_name) {
                    value.groupName = pref.$.group_name.toString();
                }
                /* jshint camelcase: true */
            }

            if (pref.$.datatype === 'enum') {
                pref.EnumValue.forEach(function (enumValue) {
                    if(isExtended) {
                        value.possibleValues.push({
                            value: enumValue.$.value.toString(),
                            /* jshint camelcase: false */
                            displayValue: enumValue.$.display_value ? enumValue.$.display_value.toString() : ''
                            /* jshint camelcase: true */
                        });
                    }
                    else{
                        value.possibleValues.push(enumValue.$.value.toString());
                    }
                });
            }

            var result = {
                name: pref.$.name,
                value: value
            };

            return result;
        }
        else{
            throw new Error('Default value attribute of <UserPref></UserPref> section should be specified.');
        }
    };

    exports.parseBrowsers = function (result) {
        var xmlParsedBrowsers = [];
        if (result.Module.Metadata[0].SupportedBrowsers &&
            result.Module.Metadata[0].SupportedBrowsers[0]) {
            var supportedBrowsers = result.Module.Metadata[0].SupportedBrowsers[0].split('|');
            supportedBrowsers.forEach(function (browser) {
                var newBrowser = {
                    browser: browser.trim().split(' ')[0].toUpperCase(),
                    version: browser.trim().split(' ')[1] ? parseInt(browser.trim().split(' ')[1], 10) : 0
                };

                xmlParsedBrowsers.push(newBrowser);
            });
        }

        return xmlParsedBrowsers;
    };

    exports.processDataSourcesOrStreams = function (xmlSourceSection) {
        var xmlSources = [];
        if (xmlSourceSection && xmlSourceSection[0] && xmlSourceSection[0].Source) {
            xmlSources = [].concat(xmlSourceSection[0].Source);
        }

        return xmlSources;
    };

    exports.processEvents = function (result) {
        var xmlParsedEventsPublish = [], xmlParsedEventsSubscribe = [], eventsResult;
        if (result.Module.Metadata[0].Events &&
            result.Module.Metadata[0].Events[0] &&
            result.Module.Metadata[0].Events[0].Event) {
            var events = result.Module.Metadata[0].Events[0].Event;
            events.forEach(function (event) {
                if(!event.Name){
                    throw new Error('Event name section of <Events></Events> section should be specified.');
                }
                if (event.Publish) {
                    xmlParsedEventsPublish.push(event.Name[0]);
                }
                if (event.Subscibe) {
                    xmlParsedEventsSubscribe.push(event.Name[0]);
                }
            });
        }
        eventsResult = {
            publish: xmlParsedEventsPublish,
            subscribe: xmlParsedEventsSubscribe
        };

        return eventsResult;
    };

    exports.processExtendedEvents = function(result){
        var xmlParsedEvents = [], currentEvent;
        if (result.Module.Metadata[0].Events &&
            result.Module.Metadata[0].Events[0] &&
            result.Module.Metadata[0].Events[0].Event) {
            var events = result.Module.Metadata[0].Events[0].Event;
            events.forEach(function (event) {
                if(!event.Name){
                    throw new Error('Event name section of <Events></Events> section should be specified.');
                }
                currentEvent = {
                    name: event.Name[0],
                    title: event.Title && event.Title[0] ? event.Title[0] : '',
                    description: event.Description && event.Description[0] ? event.Description[0] : '',
                    dataFormatDescription: event.DataFormatDescription ? event.DataFormatDescription[0] : ''
                };
                if (event.Publish) {
                    currentEvent.subscribe = false;
                    currentEvent.publish = true;
                }
                if (event.Subscribe) {
                    currentEvent.subscribe = true;
                    currentEvent.publish = false;
                }
                xmlParsedEvents.push(currentEvent);
            });
        }

        return xmlParsedEvents;
    };

    exports.checkExistence = function (parsedResult, callback, successCallback, errorCallback) {
        var params = {
            organizationId: parsedResult.query.organizationId,
            clientUserId: parsedResult.query.userId,
            widgetId: parsedResult.widgetId,
            clientOrganizationId: parsedResult.query.clientId
        };
        repository.checkWidgetExistence(params, function(isExist){
            if (!isExist) {
                callback();
            }
            else {
                successCallback(parsedResult.widgetId);
            }
        }, errorCallback);
    };

    exports.processHtml = function(data){
        if(!data){
            throw new Error('Html file in zip archive is required. Xml is not valid;');
        }

        return data;
    };

    exports.processId = function(data){
        if(!data.id){
            throw new Error('Widget xml <ModulePrefs></ModulePrefs> section should have "id" attribute.');
        }

        return data.id;
    };

    exports.processWidgetId = function(data, organizationId){
        if(!data.id){
            throw new Error('Widget xml <ModulePrefs></ModulePrefs> section should have "id" attribute.');
        }

        var widgetId = 'urn:app:' + organizationId.split(':')[2] + ':' + data.id;

        return widgetId.toLowerCase();
    };

    exports.processWidgetTitle = function(data){
        if(!data.title){
            throw new Error('Widget xml <ModulePrefs></ModulePrefs> section should have "title" attribute.');
        }

        return data.title;
    };

    exports.processWidgetDescription = function(data){
        if(!data.description){
            throw new Error('Widget xml <ModulePrefs></ModulePrefs> section should have "description" attribute.');
        }

        return data.description;
    };

    exports.processInformation = function(data){
        var information = '';
        if(data.Module.Metadata[0].Information && data.Module.Metadata[0].Information[0]){
            information = data.Module.Metadata[0].Information[0].trim();
        }

        return information;
    };

    exports.processVersionInfo = function(data){
        var versionInfo = '';
        if(data.Module.Metadata[0].VersionInfo && data.Module.Metadata[0].VersionInfo[0]){
            versionInfo = data.Module.Metadata[0].VersionInfo[0].$;
        }

        return versionInfo;
    };

    exports.processSplitArray = function(data){
        var categories = [], i;
        if(data && data[0]){
            categories = data[0].split('|');
        }
        for(i = 0; i < categories.length; i++){
            categories[i] = categories[i].trim();
        }
        return categories;
    };

    exports.processScreenshots  = function(data){
        var screenshots = [];
        if(data.Module.Metadata[0].Screenshots &&
            data.Module.Metadata[0].Screenshots[0] &&
            data.Module.Metadata[0].Screenshots[0].Img &&
            data.Module.Metadata[0].Screenshots[0].Img[0]  ){
            screenshots = data.Module.Metadata[0].Screenshots[0].Img;
        }

        return screenshots;
    };

    exports.tryGetXmlFromArchive = function(zip, callback, errorCallback){
        var xmlFile, xmlData, message, guid;
        xmlFile = zip.files['application.xml'];
        if(xmlFile){
            xmlData = zip.files['application.xml']._data;
            xmlData = xmlData.replace('ï»¿', '');
            callback(xmlData);
        }
        else{
            message = 'Can\'t find xml file in zip archive';
            guid = Guid.create();
            logger.error(message, {id: guid.value});
            errorCallback(message, guid.value, 400);
        }
    };

    exports.xmlParse = function (callback, errorCallback, successCallback, config) {
        var parsedResult, that = this, guid, xmlModule;
        that.tryGetXmlFromArchive(config.zip, function(data){
            parser.parseString(data, function (error, result) {
                if (error) {
                    var message = 'Can not process Application.xml';
                    guid = Guid.create();
                    logger.error(message, error, {id: guid.value});
                    errorCallback(message, guid.value, 400);
                }
                else {
                    try {
                        xmlModule = result.Module;
                        parsedResult = {
                            id: that.processId(xmlModule.ModulePrefs[0]['$']),
                            widgetId: that.processWidgetId(xmlModule.ModulePrefs[0]['$'], config.query.organizationId),
                            title: that.processWidgetTitle(xmlModule.ModulePrefs[0]['$']),
                            visibility: xmlModule.ModulePrefs[0].$.visibility,
                            platform: xmlModule.ModulePrefs[0].$.platform || '',
                            description: that.processWidgetDescription(xmlModule.ModulePrefs[0]['$']),
                            thumbnail: xmlModule.ModulePrefs[0].$.thumbnail,
                            width: parseInt(xmlModule.ModulePrefs[0].$.width) || 600,
                            height: parseInt(xmlModule.ModulePrefs[0].$.height) || 600,
                            minWidth: parseInt(xmlModule.ModulePrefs[0].$.minWidth) || 600,
                            minHeight: parseInt(xmlModule.ModulePrefs[0].$.minHeight) || 600,
                            information: that.processInformation(result),
                            versionInfo: that.processVersionInfo(result),
                            categories: that.processSplitArray(xmlModule.Metadata[0].Categories),
                            tags: that.processSplitArray(xmlModule.Metadata[0].Tags),
                            supportedBrowsers: that.parseBrowsers(result),
                            screenshots: that.processScreenshots(result),
                            dataSources: that.processDataSourcesOrStreams(xmlModule.Metadata[0].DataSources),
                            streams: that.processDataSourcesOrStreams(xmlModule.Metadata[0].Streams),
                            supportedDimensions: that.processSplitArray(xmlModule.Metadata[0].SupportedDimensions),
                            events: that.processEvents(result),
                            extendedEvents: that.processExtendedEvents(result),
                            preferences: that.parsePrefs(xmlModule.UserPref, false),
                            extendedPreferences: that.parsePrefs(xmlModule.UserPref, true),
                            applicationHtml: that.processHtml(xmlModule.Content[0].$.href),
                            query: config.query
                        };

                        if (config.additional.isCheck) {
                            /**
                             * upload
                             */
                            that.checkExistence(parsedResult, function () {
                                callback(parsedResult);
                            }, successCallback, errorCallback);
                        }
                        else {
                            /**
                             * update
                             */
                            callback(parsedResult);
                        }
                    }
                    catch (exception) {
                        guid = Guid.create();
                        logger.error(exception, {id: guid.value});
                        errorCallback(guid.value, exception.message, 400);
                    }
                }
            });
        }, errorCallback);
    };
}());
