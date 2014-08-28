/**
 * Created by Ruslan_Dulina on 8/7/2014.
 */

(function () {
    'use strict';
    var ZipProcessor = function (name) {
        this.fileOperation = new (require('./filesystemprocessor')).FileSystem();
        this.decompressZip = require('decompress-zip');
        this.logger = require('./logger')(module);
        this.name = name;
    };

    ZipProcessor.prototype.saveZipFile = function (data, query, callback, errorCallback) {
        this.fileOperation.writeBinaryFile(__dirname + '/../' + this.name, data, function () {
            callback(query);
        }, errorCallback);
    };

    ZipProcessor.prototype.saveWidgetConfiguration = function (xmlResult, destination, callback, errorCallback) {
        var path = '/' + 'xmlDescriptionConfig' + '.json';
        xmlResult.configPath = path;
        this.fileOperation.writeFile(destination + path, JSON.stringify(xmlResult), function () {
            callback(xmlResult.appId);
        }, errorCallback);
    };

    ZipProcessor.prototype.removeTempDirectory = function (xmlResult, source, callback, errorCallback) {
        this.fileOperation.removeFolder(source, callback, errorCallback);
    };

    ZipProcessor.prototype.changeLocation = function (xmlResult, relocationConfig, callback, errorCallback) {
        var regExpresion = /[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,
            destinationBox = __dirname +
                '/../organizations/' + xmlResult.organizationId.split(':')[2].replace(regExpresion, '_') +
                '/users/' + xmlResult.userId.replace(regExpresion, '_') +
                '/widgets/' + xmlResult.appId + relocationConfig.destination,
            destination = __dirname +
                '/../organizations/' + xmlResult.organizationId.split(':')[2].replace(regExpresion, '_') +
                '/widgets/' + xmlResult.appId + relocationConfig.destination, that = this,
            source = __dirname + '/../' + relocationConfig.source;

        that.fileOperation.copyFolder(destinationBox, source, function () {
            that.saveWidgetConfiguration(xmlResult, destinationBox, function () {
                that.fileOperation.copyFolder(destination, source, function () {
                    that.saveWidgetConfiguration(xmlResult, destination, function () {
                        that.removeTempDirectory(xmlResult, source, function () {
                            callback(xmlResult.appId);
                        }, errorCallback);
                    }, errorCallback);
                }, errorCallback);
            }, errorCallback);
        }, errorCallback);
    };

    ZipProcessor.prototype.deleteZipFile = function (query, callback, errorCallback) {
        this.fileOperation.removeFile(__dirname + '/../' + this.name, function () {
            callback(query);
        }, errorCallback);
    };

    ZipProcessor.prototype.unzipFile = function (query, tempFolder, callback, errorCallback) {
        var that = this, rootPath = __dirname + '/../',
            unzipper = new that.decompressZip(__dirname + '/../' + that.name),
            destination = rootPath + '/widgetresources' + tempFolder.replace('/', '');
        unzipper.on('error', function (exception) {
            that.logger.error(exception.message);
            errorCallback(exception.message);
        });

        unzipper.on('extract', function () {
            that.fileOperation.copyFile(rootPath + that.name,  rootPath + tempFolder + that.name, function(){
                that.fileOperation.copyFolder(destination, rootPath + tempFolder, function(){
                    that.deleteZipFile(query , callback ,errorCallback);
                }, errorCallback);
            }, errorCallback);
        });
        /**
         * Filter can check extension of files for unzipping
         */
        unzipper.extract({
            path: rootPath + tempFolder,
            filter: function (file) {
                return file.type !== 'SymbolicLink';
            }
        });
    };

    module.exports.ZipProcessor = ZipProcessor;
}());