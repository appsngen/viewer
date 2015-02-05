/**
 * Created by Ruslan_Dulina on 9/19/2014.
 */
(function () {
    'use strict';

    var stubs = require('./commonStubs');
    var mockrequire = require('proxyquire');
    var should = require('should');
    var _ = require('underscore');
    _.templateSettings = {
        evaluate    : /<%%([\s\S]+?)%%>/g,
        interpolate : /<%%=([\s\S]+?)%%>/g,
        escape      : /<%%-([\s\S]+?)%%>/g
    };
    var htmlProcessor = mockrequire.noCallThru().load('./../src/processor/modules/htmlprocessing', {
        './../../logger/logger': stubs.loggerStub,
        'htmlparser': require('htmlparser'),
        'htmlparser-to-html': require('htmlparser-to-html'),
        'underscore': _,
        'soupselect': require('soupselect'),
        './../../cache/cache' : stubs.cache
    });
    describe('HtmlBuilder', function () {
        describe('#validURL()', function () {
            it('should return false when the value is not url', function () {
                htmlProcessor.validURL('test string').should.equal(false);
            });
            it('should return true when the value is url', function () {
                htmlProcessor.validURL('https://www.google.by/').should.equal(true);
            });
        });

        describe('#createTemplateHtml()', function () {
            it('should render html head and body template from xml', function () {
                var xml = {
                    events: {
                        publish: ['SINGLE_INSTRUMENT'],
                        subscribe: ['INTERVAL_CHANGED']
                    },
                    supportedBrowsers : ['Safari, Chrome']
                };

                var expectedResult = htmlProcessor.createDom(stubs.renderedtemplate);
                var result = htmlProcessor.createTemplateHtml(xml);
                should(result).eql(expectedResult);
            });
        });

        describe('#insertData()', function () {
            var dom, domTemplate, result;


            it('should create dom from widget html file', function(){
                dom = htmlProcessor.createDom(stubs.widgetHtml);
            });

            it('should create dom from widget template html file', function(){
                domTemplate = htmlProcessor.createDom(stubs.widgetRenderedHtml);
            });

            it('should return rendered widget html from widget dom and template dom', function () {
                result = htmlProcessor.insertData(stubs.widgetHtml.toString(), domTemplate);
                result.newHtml.should.equal(stubs.resultHtml);
            });

            it('should return true in result if html is valid', function () {
                result.isValid.should.equal(true);
            });
        });

        describe('#updateWidgetPreferences()', function () {
            var widgetPreferences = [
                {
                    key: 'GLOBAL_APPLICATION_FRAME_FONT_SIZE',
                    value: '11px',
                    meta: {
                        availableValues: [{value: '11px'}, {value: '12px'}, {value: '13px'}]
                    }
                },
                {
                    key: 'GLOBAL_APPLICATION_FRAME_BORDER_COLOR',
                    value: '#EDB200',
                    meta: {
                        availableValues: [{value: '#EDB200'}, {value: '#EDB201'}, {value: '#EDB202'}]
                    }
                }
            ];
            var xml = {
                preferences: {
                    'GLOBAL_APPLICATION_FRAME_FONT_SIZE': {
                        value: '13px',
                        possibleValues: ['11px', '12px', '13px']
                    },
                    'GLOBAL_APPLICATION_FRAME_BORDER_COLOR': {
                        value: '#EDB201',
                        possibleValues: ['#EDB200', '#EDB201', '#EDB202']
                    }
                }
            };
            var result = {
                preferences: {
                    'GLOBAL_APPLICATION_FRAME_FONT_SIZE': {
                        value: '11px',
                        possibleValues: ['11px', '12px', '13px']
                    },
                    'GLOBAL_APPLICATION_FRAME_BORDER_COLOR': {
                        value: '#EDB200',
                        possibleValues: ['#EDB200', '#EDB201', '#EDB202']
                    }
                }
            };
            it('should return new applied widget preferences', function () {
                htmlProcessor.updateWidgetPreferences(widgetPreferences, xml);
                xml.should.eql(result);
            });
        });
    });
}());