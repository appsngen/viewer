/**
 * Created by Ruslan_Dulina on 12/18/2014.
 */
(function () {
    'use strict';

    var stubs = require('./commonStubs');
    var mockrequire = require('proxyquire');
    var should = require('should');
    var storage = stubs.globalStorage;
    var NodeZip = require('node-zip');

    var zipProcessor = mockrequire.noCallThru().load('./../src/processor/modules/zipprocessing', {
        './../../globalstorage' : storage,
        './../../logger/logger' : stubs.loggerStub,
        'node-zip': require('node-zip'),
        'guid' : require('guid'),
        './../../cache/cache': stubs.cache,
        './../../rabbitmq/viewerpublisher': stubs.stubViewerPublisher,
        './../../dataproviders/filesystemprovider': stubs.stubDatabaseProvider,
        './../../dataproviders/databaseprovider':stubs.stubRepository
    });

    describe('ZipProcessor', function () {
        stubs.cache.getOriginZip = function(){
            var zip = new NodeZip();
            zip.file('test.txt', 'test data');
            return zip;
        };
        var zip = stubs.cache.getOriginZip();

        describe('#createObjFromZipFile()', function () {
            it('should create new object from file', function (done) {
                var data = zip.generate({base64: false, compression: 'DEFLATE'});
                zipProcessor.createObjFromZipFile(data, function(objectArchive){
                    objectArchive.files['test.txt']._data.should.equal(zip.files['test.txt']._data);
                    done();
                });
            });
        });

        describe('#createObjFromZipFile()', function () {
            it('should call error callback with error if data is not zip archive', function (done) {
                zipProcessor.createObjFromZipFile('123', function(){}, function(err){
                    should(err.message).equal('Corrupted zip : can\'t find end of central directory');
                    done();
                });
            });
        });

        describe('#getOriginArchive()', function () {
            it('should return origin archive', function (done) {
                zipProcessor.getOriginArchive('123', function(archive){
                    var data = zip.generate({base64: false, compression: 'DEFLATE'});
                    data = new Buffer(data, 'binary');
                    delete data.offset;
                    /**
                     * time not equal.
                     */
                    data[10] = archive[10];
                    data[70] = archive[70];
                    data.should.eql(archive);
                    done();
                });
            });
        });

        describe('#getOriginArchive()', function () {
            it('should call error callback if data is not valid', function (done) {
                stubs.cache.getOriginZip = function(){
                    return { files : {
                        test: {
                            _data: 123,
                            options:{
                                binary: 'test',
                                base64: 'xo'
                            }
                        }
                    }};
                };
                zipProcessor.getOriginArchive('123', function(){}, function(error){
                    error.message.should.equal('The data of \'test\' is in an unsupported format !');
                    done();
                });
            });
        });

        describe('#getOriginArchive()', function () {
            it('should call not found callback if data is not in cache', function (done) {
                stubs.cache.getOriginZip = function(){};
                zipProcessor.getOriginArchive('123', function(){}, function(){}, function(message){
                    message.should.equal('Widget: 123 not found');
                    done();
                });
            });
        });

        describe('#setFileOptions()', function () {
            var originFile = {
                files: {
                    test: {
                        _data: '123',
                        _originData: '543',
                        options: {
                            binary: 'test1',
                            base64: 'xo1',
                            dir: '1231',
                            compression: true,
                            optimizedBinaryString: false
                        }
                    }
                }
            }, newZip, newOptions, oldOptions;

            it('should set precondition option', function (done) {
                stubs.cache.getOriginZip = function () {
                    return { files: {
                        test: {
                            _data: '123',
                            options: {
                                binary: 'test',
                                base64: 'xo',
                                dir: '123',
                                compression: true,
                                optimizedBinaryString: true
                            }
                        }
                    }};
                };
                newZip = zipProcessor.setFileContentAndOptions(originFile, 'test', zip);
                newOptions = newZip.files['test'].options;
                oldOptions = originFile.files['test'].options;
                done();
            });

            it('should set object options binary', function (done) {
                newOptions.binary.should.equal(oldOptions.binary);
                done();
            });
            it('should set object options base64', function (done) {
                newOptions.base64.should.equal(oldOptions.base64);
                done();
            });
            it('should set object options dir', function (done) {
                newOptions.dir.should.equal(oldOptions.dir);
                done();
            });
            it('should set object options compression', function (done) {
                newOptions.compression.should.equal(oldOptions.compression);
                done();
            });
            it('should set object options optimizedBinaryString', function (done) {
                newOptions.optimizedBinaryString.should.equal(oldOptions.optimizedBinaryString);
                done();
            });
        });

        describe('#saveZip()', function(){
            it('should return saving parameters and data', function () {
                var config = {
                    xml: {
                        widgetId: '123'
                    },
                    zip: zip,
                    originZip: zip,
                    globalPreferences : {},
                    query:{
                        organizationId: 'test'
                    }
                };
                zipProcessor.saveZip(config, function(info){
                    info.dataZip.should.equal(JSON.stringify(config.zip));
                    info.dataOriginZip.should.equal(JSON.stringify(config.originZip));
                    info.config.should.equal(config);
                });
            });
        });
    });
}());
