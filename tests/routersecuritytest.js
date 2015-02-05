/**
 * Created by Ruslan_Dulina on 9/29/2014.
 */
(function () {
    'use strict';
    var stubs = require('./commonStubs');
    var mockrequire = require('proxyquire');
    var should = require('should');

    var routerSecurity = mockrequire.noCallThru().load('./../src/routers/routersecurity', {
        './../logger/logger': stubs.loggerStub,
        './../cache/cache': stubs.cache
    });

    describe('RouterSecurity', function () {
        var parsedToken = {};
        describe('#parseToken()', function () {
            it('should return parsed token', function () {
                parsedToken = {
                    tokenHeader: stubs.tokenHeader,
                    tokenBody: stubs.tokenBody,
                    tokenBodyObj: JSON.parse(new Buffer(stubs.tokenBody, 'base64').toString()),
                    tokenSignature: stubs.tokenSignature,
                    algorithm: 'RSA-SHA1'
                };

                routerSecurity.parseToken(stubs.token).should.eql(parsedToken);
            });

            it('should return null if token is undefined', function () {
                should(routerSecurity.parseToken(undefined)).eql(null);
            });

            it('should return null if algorithm is not valid', function () {
                var token =  stubs.tokenHeaderWithoutAlgorithm + '.' + stubs.tokenBody + '.' + stubs.tokenSignature;
                should(routerSecurity.parseToken(token)).eql(null);
            });
        });

        describe('#isTokenSignatureValid()', function () {
            it('should return true if token signature is valid', function () {
                parsedToken = {
                    tokenHeader: stubs.tokenHeader,
                    tokenBody: stubs.tokenBodyOriginal,
                    tokenBodyObj: JSON.parse(new Buffer(stubs.tokenBody, 'base64').toString()),
                    tokenSignature: stubs.tokenSignature,
                    algorithm: 'RSA-SHA1'
                };

                should(routerSecurity.isTokenSignatureValid(parsedToken)).eql(true);
            });

            it('should return false if token signature is invalid', function () {
                parsedToken = {
                    tokenHeader: stubs.tokenHeader,
                    tokenBody: stubs.tokenBodyOriginal,
                    tokenBodyObj: JSON.parse(new Buffer(stubs.tokenBody, 'base64').toString()),
                    tokenSignature: stubs.tokenInvalidSignature,
                    algorithm: 'RSA-SHA1'
                };

                should(routerSecurity.isTokenSignatureValid(parsedToken)).eql(false);
            });

            it('should return false if data is invalid for signature', function () {
                parsedToken = {
                    tokenHeader: stubs.tokenHeader,
                    tokenBody: stubs.tokenBody,
                    tokenBodyObj: JSON.parse(new Buffer(stubs.tokenBody, 'base64').toString()),
                    tokenSignature: stubs.tokenSignature,
                    algorithm: 'RSA-SHA1'
                };

                should(routerSecurity.isTokenSignatureValid(parsedToken)).eql(false);
            });

        });

        describe('#isTokenExpired()', function () {
            it('should return false if token is not expired', function () {
                parsedToken = {
                    tokenBodyObj: JSON.parse(new Buffer(stubs.tokenBody, 'base64').toString())
                };

                should(routerSecurity.isTokenExpired(parsedToken)).eql(false);
            });

            it('should return true if token is expired', function () {
                parsedToken = {
                    tokenBodyObj: JSON.parse(new Buffer(stubs.tokenBodyExpired, 'base64').toString())
                };

                should(routerSecurity.isTokenExpired(parsedToken)).eql(true);
            });
        });

        describe('#isTokenRevoked()', function () {
            it('should return false if token is not revoked', function () {
                parsedToken = {
                    tokenBodyObj: JSON.parse(new Buffer(stubs.tokenBody, 'base64').toString())
                };
                should(routerSecurity.isTokenRevoked(parsedToken)).eql(false);
            });
        });

        describe('#isTokenDomainSimilarToParent()', function () {
            it('should return true if token domains contains referer', function () {
                parsedToken = {
                    tokenBodyObj: JSON.parse(new Buffer(stubs.tokenBody, 'base64').toString())
                };
                var referer = 'local.appsngen.com/product/my/applications/config/urn:app:top_investing:' +
                    'global_preferences_demo';

                should(routerSecurity.isTokenDomainsContainsParent(parsedToken, referer)).eql(true);
            });

            it('should return false if token domains not contains referer', function () {
                parsedToken = {
                    tokenBodyObj: JSON.parse(new Buffer(stubs.tokenBody, 'base64').toString())
                };
                var badReferer = 'local.test.com/product/my/applications/config/urn:app:top_investing:' +
                    'global_preferences_demo';

                should(routerSecurity.isTokenDomainsContainsParent(parsedToken, badReferer)).eql(false);
            });
        });

        describe('#isTokenHaveValidSub()', function () {
            parsedToken = {
                tokenBodyObj: JSON.parse(new Buffer(stubs.tokenBody, 'base64').toString())
            };

            var widgetId;

            it('should return true if token have valid widget id', function () {
                widgetId = 'urn:app:epam_systems:index_chart';

                should(routerSecurity.isTokenHaveValidSub(parsedToken, widgetId)).eql(true);
            });
            it('should return false if token have invalid widget id', function () {
                widgetId = 'index_chart1';

                should(routerSecurity.isTokenHaveValidSub(parsedToken, widgetId)).eql(false);
            });

            it('should return true if token is identity token', function () {
                parsedToken = {
                    tokenBodyObj: JSON.parse(new Buffer(stubs.tokenBodyPost, 'base64').toString())
                };

                should(routerSecurity.isTokenHaveValidSub(parsedToken)).eql(true);
            });
        });

//        describe('#generateSignature()', function () {
//            it('should return signature', function () {
//                var data = stubs.tokenHeader + '.' + stubs.tokenBodyOriginal;
//                var result = stubs.tokenSignature;
//
//                should(routerSecurity.generateSignature(data, 'RSA-SHA1')).eql(result);
//            });
//        });

        describe('#checkCookie()', function () {
            it('should return true if cookie is valid', function () {
                var cookie = routerSecurity.generateCookie('clientId', 'userId');
                should(routerSecurity.checkCookie(cookie)).eql(true);
            });

            it('should return false if cookie is invalid', function () {
                var cookie = routerSecurity.generateCookie('clientId', 'userId') + 'q';
                should(routerSecurity.checkCookie(cookie)).eql(false);
            });
        });
    });
}());
