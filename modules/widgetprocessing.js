/**
 * Created by Ruslan_Dulina on 8/12/2014.
 */

(function () {
    'use strict';
    var WidgetProcessor = function () {
        this.fileOperation = new (require('./filesystemprocessor')).FileSystem();
        this.winston = require('winston');
        this.logger = require('./logger')(module);
    };
    WidgetProcessor.prototype.getAdditionalResource =function(filename, callback){
        callback(global.viwerConfig[filename]);
    };

    WidgetProcessor.prototype.getTextHtml = function(path, callback, errorCallback){
        var that = this;
        that.fileOperation.readFile(path + '/xmlDescriptionConfig.json', function(data) {
            that.xmlResult = JSON.parse(data);
            that.fileOperation.readFile(path + '/' + that.xmlResult.applicationHtml, function(data) {
                callback(data);
            }, errorCallback);
        }, errorCallback);
    };

    WidgetProcessor.prototype.getResource = function(uri, refererQuery, callback, errorCallback){
        var patharray = uri.split('/'), regExpresion = /[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g, filename ='';
        patharray.splice(0, 1);
        patharray[1] = refererQuery.clientId.split(':')[2].replace(regExpresion,'_');
        patharray.splice(2, 0, 'users');
        patharray.splice(3, 0, refererQuery.userId.replace(regExpresion,'_'));
        patharray.forEach(function (element) {
            filename = filename + element + '\\';
        });
        filename = __dirname + '/../' + filename;
        this.fileOperation.readFile(filename, function(data){
            callback(data);
        }, errorCallback);
    };

    WidgetProcessor.prototype.getHtml = function(reqInfo, callback, nextCallback, errorCallback){
        var patharray = reqInfo.filename.split('\\'), newFilename ='',
            widgetId = patharray[patharray.length - 2], sourcearray = patharray.slice(), newSource = '';
        patharray.splice(patharray.length - 4, patharray.length - 1);
        sourcearray.splice(sourcearray.length - 2, sourcearray.length - 1);
        sourcearray.forEach(function (element) {
            newSource = newSource + element + '\\';
        });
        newSource = newSource + '\\' + widgetId;
        patharray.forEach(function (element) {
            newFilename = newFilename + element + '\\';
        });

        var regExpresion = /[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,
            path = newFilename + reqInfo.query.clientId.split(':')[2].replace(regExpresion,'_') +
            '\\users\\' + reqInfo.query.userId.replace(regExpresion,'_') +
            '\\widgets\\' + widgetId, that = this;


        this.fileOperation.exist(path, function(exists){
            if (!exists) {
                newSource = newSource + 'Resources';
                that.fileOperation.copyFolder(path, newSource, function(){
                    that.fileOperation.readFile(path + '/xmlDescriptionConfig.json', function(data){
                        that.xmlResult = JSON.parse(data);
                        reqInfo.query.organizationId = reqInfo.query.clientId;
                        var dirname = __dirname.replace('/modules', '');
                        path = path.replace(dirname, '') + '/';
                        nextCallback(that.xmlResult, reqInfo.query, path);
                    }, errorCallback);
                }, errorCallback);
            }
            else{
                that.getTextHtml(path, function(html){
                    callback(html);
                }, errorCallback);
            }
        });
    };

    module.exports.WidgetProcessor = WidgetProcessor;
}());