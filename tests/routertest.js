/**
 * Created by Ruslan_Dulina on 12/24/2014.
 */

(function () {
    'use strict';
    var stubs = require('./commonStubs');
    var mockrequire = require('proxyquire');
    var should = require('should');

    var router = mockrequire.noCallThru().load('./../src/routers/router', {
        './routerhelpers': stubs.routerhelpers,
        './../globalstorage': stubs.globalStorage
    });

    describe('Router', function () {
        describe('#downloadArchive()', function () {
            var request = {
                setEncoding: function () {
                },
                checkParams: function () {
                    return {
                        notEmpty: function () {
                        }
                    };
                },
                validationErrors: function () {
                },
                param: function () {
                    return 'urn:app:epam_systems:index_char';
                },
                organizationId: 'urn:org:epam_systems'
            };
            var response = {
                setHeader: function () {
                }
            };
            it('should call next route if widget belongs to organization', function () {
                router.preconditionCheck(request, response, function () {
                    should(stubs.routerhelpers.widgetId).eql('');
                });
            });
            it('should send access forbidden of widget not belong to organization', function () {
                request.organizationId = 'urn:org:tr';
                router.preconditionCheck(request, response);
                var result = 'Widget: ' + request.param() + ' not belong to organization: ' + request.organizationId;
                should(stubs.routerhelpers.message).eql(result);
            });
            it('should send bad request if widget id is not in params list', function () {
                request.validationErrors = function () {
                    return {message: 'error'};
                };
                router.preconditionCheck(request, response);
                should(stubs.routerhelpers.error).eql('{ message: \'error\' }');
            });
        });
    });
}());