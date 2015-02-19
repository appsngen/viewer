/**
 * Created by Ruslan_Dulina on 8/11/2014.
 */

(function () {
    'use strict';
    var logger = require('./../../../logger/logger')(module);
    var htmlParser = require('htmlparser');
    var storage= require('./../../../globalstorage').getStorage();
    var _ = require('underscore');
    var cache = require('./../../../cache/cache');
    var endOfLine = require('os').EOL;
    var Guid = require('guid');
    var deepCopy = require('deepcopy');
    _.templateSettings = {
        evaluate: /<%%([\s\S]+?)%%>/g,
        interpolate: /<%%=([\s\S]+?)%%>/g,
        escape: /<%%-([\s\S]+?)%%>/g
    };

    exports.createTemplateHtml = function (xml) {
        var config, dataTemplate, i, result = [];
        dataTemplate = cache.getTemplateHtml();
        config = deepCopy(storage.staticFiles.applicationWeb);
        config.authToken = '<%%=token%%>';
        config['appstore.api'].unsupportedBrowserUrl = '<%%=unsupportedBrowserUrl%%>';
        config['appstore.api'].datasourceProxyUrl = '<%%=datasourceProxyUrl%%>';
        config['appstore.api'].activProxyWebSocketUrl = '<%%=activProxyWebSocketUrl%%>';
        config['appstore.api'].ieDataProxy = '<%%=ieDataProxy%%>';

        config['core.util']['appstore.events'].events.publish = xml.events.publish;
        config['core.util']['appstore.events'].events.subscribe = xml.events.subscribe;
        for(i = 0; i < dataTemplate.length; i++) {
            result.push(_.template(dataTemplate[i].toString())({
                config: config,
                supportedBrowsers: JSON.stringify(xml.supportedBrowsers),
                preferences: '<%%=JSON.stringify(preferences)%%>',
                baseUrl: '<%%=baseUrl%%>'
            }));
        }

        return result;
    };

    exports.createDom = function (rawHtml) {
        var handler = new htmlParser.DefaultHandler(function (error) {
            if (error) {
                var message = 'Can not parse html. Html is not valid;';
                var guid = Guid.create();
                logger.error(message, error, {id: guid.value});
            }
        }, {
            verbose: true,
            ignoreWhitespace: false,
            enforceEmptyTags: true
        });

        var parser = new htmlParser.Parser(handler);

        parser.parseComplete(rawHtml);

        return handler.dom;
    };

    exports.insertLine = function (source, line, position) {
        var newSource;
        newSource = [source.slice(0, position), line, source.slice(position)].join('');

        return newSource;
    };

    exports.insertData = function (rawHtml, templateDom) {
        var i, result = {};
        var positionEndBody;
        var positionEndHead;
        var positionStartHead;
        result.isValid = false;
        try {
            /**
             * Insert runOnLoadHandlers script in the end of the section body.
             */
            var newLine = endOfLine + templateDom[templateDom.length - 1];
            positionEndBody = rawHtml.indexOf('</body>');
            rawHtml = this.insertLine(rawHtml, newLine, positionEndBody);

            /**
             * Insert all other scripts (except ready and google analytics) from template into widget head section
             */
            newLine = '';
            for (i = 0; i < templateDom.length - 2; i++) {
                newLine = newLine + endOfLine + templateDom[i];
            }

            positionStartHead = rawHtml.indexOf('<head>') + '<head>'.length;
            rawHtml = this.insertLine(rawHtml, newLine, positionStartHead);

            /**
             * Insert google analytics script in the end of the head section (google requirement).
             * http://stackoverflow.com/
             * questions/3173571/should-i-put-the-google-analytics-js-in-the-head-or-at-the-end-of-body
             */
            newLine = endOfLine + templateDom[templateDom.length - 2];
            positionEndHead = rawHtml.indexOf('</head>');
            rawHtml = this.insertLine(rawHtml, newLine, positionEndHead);

            result.isValid = true;
            result.newHtml = rawHtml;
        } catch (exception) {
            var message = 'Can not parse html. Html is not valid;';
            var guid = Guid.create();
            logger.error(message, exception, {id: guid.value});

            return result;
        }

        return result;
    };

    exports.updateWidgetPreferences = function (widgetPreferences, xml) {
        widgetPreferences.forEach(function (element) {
            if (xml.preferences[element.key] !== undefined) {
                xml.preferences[element.key].value = element.value;
                xml.preferences[element.key].possibleValues = [];
                element.meta.availableValues.forEach(function (valueElement) {
                    xml.preferences[element.key].possibleValues.push(valueElement.value);
                });
            }
        });
    };

    exports.createRequestedHtml = function (xml, html, preferences, token) {
        var config = storage.staticFiles.applicationWeb;
        this.updateWidgetPreferences(preferences, xml);

        var result = _.template(html)({
            token: token,
            preferences: xml.preferences,
            baseUrl: storage.baseUrl,
            unsupportedBrowserUrl: config['appstore.api'].unsupportedBrowserUrl,
            datasourceProxyUrl: config['appstore.api'].datasourceProxyUrl,
            activProxyWebSocketUrl: config['appstore.api'].activProxyWebSocketUrl,
            ieDataProxy: config['appstore.api'].ieDataProxy
        });

        return result;
    };

    exports.validURL = function (str) {
        var pattern = new RegExp('https?:\/\/');
        return pattern.test(str);
    };

    exports.buildTemplate = function (xml, organizationPreferences, zip, callback, errorCallback) {
        var templateDom, result, exception, applicationHtml;

        templateDom = this.createTemplateHtml(xml);
        applicationHtml = zip.files[xml.applicationHtml];
        if (applicationHtml) {
            // remove UTF-8 BOM if necessary
            if (applicationHtml._data.indexOf('ï»¿') === 0) {
                applicationHtml._data = applicationHtml._data.substring(3);
            }

            result = this.insertData(applicationHtml._data, templateDom);
            if (result.isValid) {
                applicationHtml._originData = applicationHtml._data;
                applicationHtml._data = result.newHtml;
                callback(xml);
            } else {
                exception = new Error('Exception occurred during processing html.');
                errorCallback(exception);
            }
        } else {
            exception = new Error('Can\'t find html file in zip archive. Html file should be placed in archive.');
            errorCallback(exception);
        }
    };
}());