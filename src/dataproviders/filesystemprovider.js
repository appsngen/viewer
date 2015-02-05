/**
 * Created by Ruslan_Dulina on 9/8/2014.
 */

(function () {
    'use strict';
    var widgetsRepository = require('./repositories/widgetsfilesystemrepository');
    var logger = require('./../logger/logger')(module);
    var storagePath = '/../widgets/';
    exports.getWidget = function (params, callback, errorCallback){
        var element = {};
        widgetsRepository.exist(storagePath + params.widgetId.replace(/:/g, '_'), function(isExist){
            if(isExist){
                widgetsRepository.readFile(storagePath + params.widgetId.replace(/:/g, '_'), function(data){
                    data = JSON.parse(data);
                    element.widgetId = data.widgetId;
                    element.compiledData = JSON.parse(new Buffer(data.compiledData, 'binary'));
                    element.originData = JSON.parse(new Buffer(data.originData,'binary'));
                    callback(element);
                }, errorCallback);
            }
            else{
                callback();
            }
        });
    };

    exports.checkWidgetExistence = function (params, callback, errorCallback){
        var element = {};
        widgetsRepository.exist(storagePath + params.widgetId.replace(/:/g, '_'), function(isExist){
            if(isExist){
                widgetsRepository.readFile(storagePath + params.widgetId.replace(/:/g, '_'), function(data){
                    data = JSON.parse(data);
                    element.widgetId = data.widgetId;
                    element.compiledData = JSON.parse(new Buffer(data.compiledData, 'binary'));
                    element.originData = JSON.parse(new Buffer(data.originData,'binary'));
                    callback(isExist, element);
                }, errorCallback);
            }
            else{
                callback(isExist);
            }
        });
    };

    exports.saveWidget = function (zip, originZip, xml, callback, errorCallback) {
        var data = {
            widgetId: xml.widgetId,
            compiledData: zip,
            originData: originZip
        };
        var filename = xml.widgetId.replace(/:/g, '_');
        widgetsRepository.createPath(storagePath, function(){
            data = JSON.stringify(data);
            widgetsRepository.exist(storagePath + filename, function(isExist){
                if(isExist){
                    widgetsRepository.removeFile(storagePath + filename, function(){
                        widgetsRepository.writeFile(storagePath + filename, data, callback, errorCallback);
                    }, errorCallback);
                }
                else{
                    widgetsRepository.writeFile(storagePath + filename, data, callback, errorCallback);
                }
            });
        }, errorCallback);
    };

    exports.deleteWidget = function (params, callback, errorCallback) {
        widgetsRepository.exist(storagePath + params.widgetId.replace(/:/g, '_'), function(isExist){
            if(isExist){
                widgetsRepository.removeFile(storagePath + params.widgetId.replace(/:/g, '_'), callback, errorCallback);
            }
            else{
                callback();
            }
        });
    };

    exports.getAllWidgets = function(callback, errorCallback){
        var i;
        widgetsRepository.createPath(storagePath, function() {
            widgetsRepository.readDir(storagePath, function (widgetList) {
                logger.info('In database now ' + widgetList.length + ' widgets');
                for (i = 0; i < widgetList.length; i++) {
                    widgetList[i] = JSON.parse(widgetList[i]);
                    logger.info((i + 1) + ') ' + widgetList[i].widgetId);
                    logger.info('Downloaded of widget ' + widgetList[i].widgetId + ' is started.');
                    widgetList[i].compiledData = JSON.parse(new Buffer(widgetList[i].compiledData, 'binary'));
                    widgetList[i].originData = JSON.parse(new Buffer(widgetList[i].originData,'binary'));
                    logger.info('Widget ' + widgetList[i].widgetId + ' is downloaded.');
                }
                callback(widgetList);
            }, errorCallback);
        }, errorCallback);
    };
}());