/**
 * Created by Ruslan_Dulina on 8/18/2014.
 */

(function () {
    'use strict';
    var FileSystem = function () {
        this.fs = require('fs-extra');
        this.logger = require('./logger')(module);
        this.ncp = require('ncp').ncp;
        this.mkdirp = require('mkdirp');
        this.rmdir = require('rimraf');
    };
    FileSystem.prototype.readFileSync = function(filename){
        var result = this.fs.readFileSync(filename);
        return result;
    };

    FileSystem.prototype.readFile = function (filename, callback, errorCallback) {
        var that = this, message;
        this.fs.exists(filename, function (exists) {
            if (!exists) {
                message = 'Can not find file ' + filename;
                that.logger.error(message);
                errorCallback(message);
            }
            else {
                that.fs.readFile(filename, function (error, data) {
                    if (error) {
                        message = 'Can not read file ' + filename;
                        that.logger.error(message);
                        errorCallback(message);
                    }
                    else {
                        callback(data);
                    }
                });
            }
        });
    };

    FileSystem.prototype.writeFile = function (filename, data, callback, errorCallback) {
        var that = this;
        this.fs.writeFile(filename, data, function (error) {
            if (error) {
                that.logger.error(error);
                errorCallback(error);
            }
            else {
                callback();
            }
        });
    };

    FileSystem.prototype.writeBinaryFile = function (filename, data, callback, errorCallback) {
        var that = this;
        this.fs.writeFile(filename, data,'binary', function (error) {
            if (error) {
                that.logger.error(error);
                errorCallback(error);
            }
            else {
                callback();
            }
        });
    };

    FileSystem.prototype.copyFolder = function (destination, source, callback, errorCallback) {
        var that = this;
        that.removeFolder(destination, function(){
            that.mkdirp(destination, function (error) {
                if (error) {
                    that.logger.error(error[0].message);
                    errorCallback(error[0].message);
                }
                else {
                    that.ncp(source, destination, function (error) {
                        if (error) {
                            that.logger.error(error[0].message);
                            errorCallback(error[0].message);
                        }
                        else {
                            callback();
                        }
                    });
                }
            });
        }, errorCallback);
    };

    FileSystem.prototype.createPath = function(destination, callback, errorCallback){
        var that = this;
        this.mkdirp(destination, function (error) {
            if (error) {
                that.logger.error(error[0].message);
                errorCallback(error[0].message);
            }
            else {
                callback();
            }
        });
    };

    FileSystem.prototype.exist = function (path, callback) {
        this.fs.exists(path, function (exists) {
            callback(exists);
        });
    };

    FileSystem.prototype.removeFolder = function (source, callback, errorCallback) {
        var that = this;
        this.rmdir(source, function (error) {
            if (error) {
                that.logger.error(error.message, error.code, error.errno);
                errorCallback(error.message);
            }
            else {
                callback();
            }
        });
    };

    FileSystem.prototype.removeFile = function (filename, callback, errorCallback) {
        var that = this;
        this.fs.unlink(filename, function (error) {
            if (error) {
                that.logger.error(error.message, error);
                errorCallback(error.message);
            }
            else {
                callback();
            }
        });
    };

    FileSystem.prototype.copyFile = function (source, destination, callback, errorCallback) {
        var that = this;
        this.fs.copy(source, destination, function (error) {
            if (error) {
                that.logger.error(error.message, error);
                errorCallback(error.message);
            }
            else {
                callback();
            }
        });
    };

    FileSystem.prototype.createFileIfNotExist = function(filename, callback) {
        var that = this;
        this.exist(filename, function (exist) {
            if (!exist) {
                that.fs.openSync(filename, 'w');
            }
            callback();
        });
    };

    module.exports.FileSystem = FileSystem;
}());