/**
 * Created by Ruslan_Dulina on 8/18/2014.
 */

(function () {
    'use strict';

    var fs = require('fs-extra');
    var logger = require('./../../logger/logger')(module);
    var ncp = require('ncp').ncp;
    var mkdirp = require('mkdirp');
    var rmdir = require('rimraf');
    var root = __dirname + '/../../';
    var Guid = require('guid');
    
    exports.readFileSync = function(filename){
        var result = fs.readFileSync(root + filename);
        return result;
    };

    exports.readDirSync = function(dir) {
        var result = fs.readdirSync(root + dir);
        return result;
    };

    exports.readDir = function(dir, callback, errorCallback) {
        var message, that = this, widgets = [];
        fs.readdir(root + dir, function(error, list){
            if(error){
                message = 'Can not read dir ' + root + dir;
                var guid = Guid.create();
                logger.error(message, error, {id: guid.value});
                errorCallback(message, guid.value);
            }
            else{
                if(list.length === 0){
                    callback(widgets);
                }
                else{
                    list.forEach(function(file){
                        that.readFile(dir + file, function(data){
                            widgets.push(data);
                            if(widgets.length === list.length){
                                callback(widgets);
                            }
                        }, errorCallback);
                    });
                }
            }
        });
    };

    exports.readFile = function (filename, callback, errorCallback) {
        var message;
        fs.exists(root + filename, function (exists) {
            if (!exists) {
                message = 'Can not find file ' + filename;
                var guid = Guid.create();
                logger.error(message, {id: guid.value});
                errorCallback(message, guid.value);
            }
            else {
                fs.readFile(root + filename, function (error, data) {
                    if (error) {
                        message = 'Can not read file ' + filename;
                        var guid = Guid.create();
                        logger.error(message, error, {id: guid.value});
                        errorCallback(message, guid.value);
                    }
                    else {
                        callback(data);
                    }
                });
            }
        });
    };

    exports.writeFile = function (filename, data, callback, errorCallback) {
        fs.writeFile(root + filename, data, function (error) {
            if (error) {
                var guid = Guid.create();
                logger.error(error, {id: guid.value});
                errorCallback(error, guid.value);
            }
            else {
                callback();
            }
        });
    };

    exports.writeFileSync = function (filename, path, data, callback, errorCallback) {
        var that = this;

        that.exist(filename, function (exist) {
            if (!exist) {
                that.createPath(path, function () {
                    fs.writeFileSync(root + filename, data);
                    callback();
                }, errorCallback);
            }
            else{
                callback();
            }
        });


    };

    exports.writeBinaryFile = function (filename, data, callback, errorCallback) {
        fs.writeFile(root + filename, data,'binary', function (error) {
            if (error) {
                var guid = Guid.create();
                logger.error(error, {id: guid.value});
                errorCallback(error, guid.value);
            }
            else {
                callback();
            }
        });
    };

    exports.copyFolder = function (destination, source, callback, errorCallback) {
        var that = this;
        that.removeFolder(destination, function(){
            mkdirp(root + destination, function (error) {
                if (error) {
                    var guid = Guid.create();
                    logger.error(error, {id: guid.value});
                    errorCallback(error, guid.value);
                }
                else {
                    ncp(root + source, root + destination, function (error) {
                        if (error) {
                            var guid = Guid.create();
                            logger.error(error, {id: guid.value});
                            errorCallback(error, guid.value);
                        }
                        else {
                            callback();
                        }
                    });
                }
            });
        }, errorCallback);
    };

    exports.createPath = function(destination, callback, errorCallback){
        this.exist(root + destination, function(isExist){
            if(isExist){
                callback();
            }
            else{
                mkdirp(root + destination, function (error) {
                    if (error) {
                        var guid = Guid.create();
                        logger.error(error, {id: guid.value});
                        errorCallback(error, guid.value);
                    }
                    else {
                        callback();
                    }
                });
            }
        });
    };

    exports.exist = function (path, callback) {
        fs.exists(root + path, function (exists) {
            callback(exists);
        });
    };

    exports.removeFolder = function (source, callback, errorCallback) {
        rmdir(root + source, function (error) {
            if (error) {
                var guid = Guid.create();
                logger.error(error, {id: guid.value});
                errorCallback(error, guid.value);
            }
            else {
                callback();
            }
        });
    };

    exports.removeFolderSync = function (source) {
        this.rmdir.sync(root + source);
    };

    exports.removeFile = function (filename, callback, errorCallback) {
        fs.unlink(root + filename, function (error) {
            if (error) {
                var guid = Guid.create();
                logger.error(error, {id: guid.value});
                errorCallback(error, guid.value);
            }
            else {
                callback();
            }
        });
    };

    exports.copyFile = function (source, destination, callback, errorCallback) {
        fs.copy(root + source, root + destination, function (error) {
            if (error) {
                var guid = Guid.create();
                logger.error(error, {id: guid.value});
                errorCallback(error, guid.value);
            }
            else {
                callback();
            }
        });
    };

    exports.createFileIfNotExist = function(filename, path, callback, errorCallback) {
        var that = this;

        that.exist(filename, function (exist) {
            if (!exist) {
                that.createPath(path, function () {
                    var fd = fs.openSync(root + filename, 'w');
                    fs.closeSync(fd);
                    callback();
                }, errorCallback);
            }
            else{
                callback();
            }
        });
    };
}());