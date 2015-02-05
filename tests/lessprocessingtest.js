/**
 * Created by Ruslan_Dulina on 9/22/2014.
 */

(function () {
    'use strict';
    var stubs = require('./commonStubs');
    var mockrequire = require('proxyquire');
    var should = require('should');

    var lessProcessor = mockrequire.noCallThru().load('./../src/processor/modules/lessprocessing', {
        './../../logger/logger': stubs.loggerStub,
        'less': require('less')
    });

    describe('LessBuilder', function () {
        var preferences = {
            'table-bg': 'red',
            'table-border-color': 'black',
            'font-size-base': '11px',
            'table-bg-active': 'white'
        };
        var invalidPreferences= {
            'table-bg': 'red',
            'table-border-color': 'black',
            'font-size-base': '11px'
        };
        describe('#compileLess()', function () {
            it('should return css if less is valid and all variables are declared', function (done) {
                lessProcessor.compileLess(stubs.less, preferences, function(css){
                    css.should.equal(stubs.cssResult);
                    done();
                });
            });
            it('should return error equal null if less is valid and all variables are declared', function (done) {
                lessProcessor.compileLess(stubs.less, preferences, function(css, error){
                    should(error).equal(null);
                    done();
                });
            });

            it('should return css which contains error text if not all variables are declared', function (done) {
                lessProcessor.compileLess(stubs.less, invalidPreferences, function(css){
                    should(css).equal('variable @table-bg-active is undefined');
                    done();
                });
            });

            it('should return error if less is valid and not all variables are declared', function (done) {
                lessProcessor.compileLess(stubs.less, invalidPreferences, function(css, error){
                    should(error.message).equal('variable @table-bg-active is undefined');
                    done();
                });
            });
        });
    });
}());