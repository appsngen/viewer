/**
 * Created by Ruslan_Dulina on 9/22/2014.
 */

(function () {
    'use strict';

    var stubs = require('./commonStubs');
    var mockrequire = require('proxyquire');
    var should = require('should');
    var storage = stubs.globalStorage;

    var tokensCache = mockrequire.noCallThru().load('./../src/cache/tokenscache', {
        './../processor/modules/restservicesrequester': stubs.restServicesRequesterStub,
        './../globalstorage': storage,
        './widgetcache' : stubs.widgetCache,
        './../logger/logger': stubs.loggerStub
    });

    var compiledWidgetCache = mockrequire.noCallThru().load('./../src/cache/compiledwidgetcache', {
        './../globalstorage': storage
    });

    describe('TokensCache', function () {
        describe('#generateKey()', function () {
            it('should generate key using userId and widgetId', function () {
                tokensCache.generateKey('userId', 'widgetId').should.equal('userId.widgetId');
            });
        });

        describe('#getToken()', function () {
            it('should get token from storage if it exist and not expired', function () {
                tokensCache.getToken('widgetId', 'userId', function(token){
                    should(token).equal(stubs.token);
                }, function(){});
            });

            it('should get new token if it not exist', function () {
                tokensCache.getToken('widgetIdNotExisting', 'userId', function(token){
                    should(token).equal('testToken');
                }, function(){});
            });

            it('should get new token if it expired', function () {
                tokensCache.getToken('widgetId', 'userIdExpired', function(token){
                    should(token).equal('testToken');
                }, function(){});
            });
        });

        describe('#isTokenExpired()', function () {
            it('should return true if token is expired', function () {
                tokensCache.isTokenExpired('userIdExpired1.widgetId1').should.equal(true);
            });
            it('should return false if token is not expired', function () {
                tokensCache.isTokenExpired('userId.widgetId').should.equal(false);
            });
        });

        describe('#refreshToken()', function(){
            it('should refresh token in cache', function () {
                var widgetId = 'widgetIdNew', expiresIn = 1, userId = 'userIdNew', token = 'tokenNew';
                tokensCache.refreshToken(widgetId, expiresIn, userId, token);
                storage.getStorage().cache.tokens['userIdNew.widgetIdNew'].should.equal(token);
            });
        });

        describe('#getNewToken()', function(){
            it('should get new token if xml was in cache', function () {
                var widgetId = 'widgetIdNew',  userId = 'userIdNew';
                tokensCache.getNewToken(widgetId, userId, function(token, isNewToken){
                    token.should.equal('testToken');
                    isNewToken.should.equal(true);
                });
            });

            it('should return call not found callback and return widget id if xml was not found', function () {
                stubs.widgetCache.getXml = function(){};
                var widgetId = 'widgetIdNew',  userId = 'userIdNew';
                tokensCache.getNewToken(widgetId, userId, function(){}, function(){}, function(widgetId){
                    widgetId.should.equal('widgetIdNew');
                });
            });
        });
    });

    describe('CompiledWidgetCache', function () {
        var params = {
            widgetId: 'widgetId',
            clientOrganizationId: 'organizationId',
            filePath: 'filePath'
        };
        describe('#generateKey()', function () {
            it('should generate key using organizationId, widgetId, filePath', function () {
                var result = 'widgetId.filePath.organizationId';
                compiledWidgetCache.generateKey('organizationId', 'widgetId', 'filePath').should.equal(result);
            });
        });

        describe('#getCompiledResource()', function () {
            it('should return widget compiled resource using key organizationId, widgetId, filePath', function () {
                compiledWidgetCache.getCompiledResource(params).should.equal('compiledData');
            });
        });

        describe('#removeAllByWidgetId()', function () {
            it('should remove all data from cache by widgetId', function () {
                compiledWidgetCache.removeAllByWidgetId('widgetId');
                should(compiledWidgetCache.getCompiledResource(params)).equal(undefined);
            });
        });
    });
}());