/**
 * Created by Ruslan_Dulina on 9/22/2014.
 */

(function () {
    'use strict';

    var stubs = require('./commonStubs');
    var mockrequire = require('proxyquire');
    var should = require('should');

    var widgetProcessor = mockrequire.noCallThru().load('./../src/processor/modules/widgetprocessing', {
        './../../logger/logger' : stubs.loggerStub,
        './../../globalstorage' : stubs.globalStorage,
        './../../dataproviders/filesystemprovider':stubs.stubRepository,
        './../../dataproviders/databaseprovider':stubs.stubRepository,
        './../../cache/cache':stubs.cache,
        './../../rabbitmq/viewerpublisher': stubs.stubViewerPublisher
    });

    describe('WidgetProcessor', function () {
        describe('#getResourceFilePath()', function () {
            it('should return file path by formatting uri', function () {
                var result = 'css/preferences-styles.less';
                widgetProcessor.getResourceFilePath(stubs.resourceUrl).should.equal(result);
            });
        });

        describe('#getRequestResourceParams()', function () {
            it('should return object which contains request by resource params', function () {
                var result = {
                    organizationId: 'urn:org:top_investing',
                    clientUserId: 'test',
                    widgetId: 'urn:app:top_investing:global_preferences_demo',
                    clientOrganizationId: 'test',
                    id: 123
                };

                var credentials = {
                    userId: 'test',
                    clientId: 'test'
                };

                should(widgetProcessor.getRequestResourceParams(stubs.resourceUrl, credentials)).eql(result);
            });
        });

        describe('#getRequestHtmlParams()', function () {
            var reqInfo = {
                query: {
                    userId: 'test',
                    clientId: 'test'
                },
                filename: '/organizations/urn:org:top_investing/widgets/urn:app:top_investing:' +
                    'global_preferences_demo/index.html'
            };

            var result = {
                organizationId: 'urn:org:top_investing',
                clientUserId: 'test',
                widgetId: 'urn:app:top_investing:global_preferences_demo',
                clientOrganizationId: 'test',
                id: 123
            };

            it('should return object which contains request by html params', function () {
                should(widgetProcessor.getRequestHtmlParams(reqInfo)).eql(result);
            });
        });

        describe('#compileResource()', function () {
            var lessProcessor = require('./../src/processor/modules/lessprocessing');
            var params = {
                globalPreferences : {
                    organizationPreferences: {
                        'table-bg': 'red',
                        'table-border-color': 'black',
                        'font-size-base': '11px',
                        'table-bg-active': 'white'
                    },
                    lastModifiedPreferences: 123
                },
                result: stubs.less
            };
            it('should return compiled resource', function () {
                should(widgetProcessor.compileResource(lessProcessor, params, function(data){
                    should(data).equal(stubs.cssResult);
                }, function(){}));
            });

            it('should return compiled resource with status code 200', function () {
                should(widgetProcessor.compileResource(lessProcessor, params, function(data, status){
                    should(status).equal(200);
                }, function(){}));
            });

            it('should return compiled resource with status code 500 if there was compilation errors', function () {
                var wrongParams = {
                    globalPreferences : {
                        organizationPreferences: {
                            'table-bg': 'red',
                            'table-border-color': 'black',
                            'font-size-base': '11px'
                        },
                        lastModifiedPreferences: 123
                    },
                    result: stubs.less
                };
                should(widgetProcessor.compileResource(lessProcessor, wrongParams, function(data, status){
                    should(status).equal(500);
                }, function(){}));
            });

            it('should save compiled resources in compiled cache', function () {
                should(widgetProcessor.compileResource(lessProcessor, params, function(data){
                    should(stubs.testData.data).equal(data);
                }, function(){}));
            });

            it('should set time of global preferences with which it was compiled', function () {
                should(widgetProcessor.compileResource(lessProcessor, params, function(){
                    should(stubs.testData.time).equal(123);
                }, function(){}));
            });
        });
    });

}());