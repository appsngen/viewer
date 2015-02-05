/**
 * Created by Ruslan_Dulina on 9/19/2014.
 */
(function () {
    'use strict';

    var stubs = require('./commonStubs');
    var mockrequire = require('proxyquire');
    var should = require('should');
    var xml2js = require('xml2js'), parser = new xml2js.Parser();

    var xmlProcessor = mockrequire.noCallThru().load('./../src/processor/modules/xmlprocessing', {
        './../../globalstorage' : stubs.globalStorage,
        './../../logger/logger': stubs.loggerStub,
        'xml2js': require('xml2js'),
        './../../dataproviders/filesystemprovider' : stubs.stubRepository,
        './../../dataproviders/databaseprovider':stubs.stubRepository
    });

    var initialize = function(error, data){
        describe('XmlProcessor', function () {
            describe('#parsePref()', function () {
                var pref = {
                    $ : {
                        /* jshint camelcase: false */
                        default_value : true,
                        /* jshint camelcase: true */
                        datatype: 'bool',
                        name: 'isValue'
                    }
                };
                var result = {
                    name: pref.$.name,
                    value: {
                        type: 'BOOL',
                        value: 'true',
                        possibleValues: []
                    }
                };
                it('should return parsed widget preference', function () {
                    should(xmlProcessor.parsePref(pref)).eql(result);
                });
                it('should return parsed possible values if type of preference is enum', function () {
                    pref.$.datatype = 'enum';
                    pref.EnumValue = [{$: {value: false}}];
                    result.value.possibleValues = ['false'];
                    result.value.type = 'ENUM';
                    should(xmlProcessor.parsePref(pref)).eql(result);
                });
            });

            describe('#parseBrowsers()', function () {
                it('should process browsers from xml', function () {
                    var result = [
                        {
                            browser: 'IE',
                            version: 8
                        },
                        {
                            browser: 'FIREFOX',
                            version: 0
                        }
                    ];
                    should(xmlProcessor.parseBrowsers(data)).eql(result);
                });
            });

            describe('#processDataSourcesOrStreams()', function () {
                it('should process data sources from xml', function () {
                    var result = ['tr.symbolinfo', 'epam_systems.mashupengine'];
                    should(xmlProcessor.processDataSourcesOrStreams(data.Module.Metadata[0].DataSources)).eql(result);
                });

                it('should process streams from xml', function () {
                    var result = ['activ1', 'activ2'];
                    should(xmlProcessor.processDataSourcesOrStreams(data.Module.Metadata[0].Streams)).eql(result);
                });
            });

            describe('#processEvents()', function () {
                it('should process events from xml', function () {
                    var result = {
                        publish: ['INDEX_SELECTED', 'INTERVAL_CHANGED'],
                        subscribe: []
                    };
                    should(xmlProcessor.processEvents(data)).eql(result);
                });
            });
        });
    };

    parser.parseString(stubs.xmlString, initialize);
}());