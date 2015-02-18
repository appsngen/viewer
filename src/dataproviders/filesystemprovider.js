/**
 * Created by Ruslan_Dulina on 9/8/2014.
 */

(function () {
    'use strict';
    var widgetsRepository = require('./repositories/widgetsfilesystemrepository');
    var logger = require('./../logger/logger')(module);
    var storagePath = '/../widgets/';

    var getFilenameByWidgetId = function(widgetId){
        return widgetId.replace(/:/g, '_');
    };

    exports.getWidget = function (params, callback, errorCallback){
        var widgetInfo = {}, filename;
        filename = getFilenameByWidgetId(params.widgetId);
        widgetsRepository.exist(storagePath + filename, function(isExist){
            if(isExist){
                widgetsRepository.readFile(storagePath + filename, function(data){
                    data = JSON.parse(data);
                    widgetInfo.widgetId = data.widgetId;
                    widgetInfo.compiledData = JSON.parse(new Buffer(data.compiledData, 'binary'));
                    widgetInfo.originData = JSON.parse(new Buffer(data.originData,'binary'));
                    callback(widgetInfo);
                }, errorCallback);
            }
            else{
                callback();
            }
        });
    };

    exports.checkWidgetExistence = function (params, callback, errorCallback){
        var widgetInfo = {}, filename;
        filename = getFilenameByWidgetId(params.widgetId);
        widgetsRepository.exist(storagePath + filename, function(isExist){
            if(isExist){
                widgetsRepository.readFile(storagePath + filename, function(data){
                    data = JSON.parse(data);
                    widgetInfo.widgetId = data.widgetId;
                    widgetInfo.compiledData = JSON.parse(new Buffer(data.compiledData, 'binary'));
                    widgetInfo.originData = JSON.parse(new Buffer(data.originData,'binary'));
                    callback(isExist, widgetInfo);
                }, errorCallback);
            }
            else{
                callback(isExist);
            }
        });
    };

    exports.saveWidget = function (compiledZip, originZip, xml, callback, errorCallback) {
        var data = {
            widgetId: xml.widgetId,
            compiledData: compiledZip,
            originData: originZip
        }, filename;
        filename = getFilenameByWidgetId(xml.widgetId);
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
        var filename;
        filename = getFilenameByWidgetId(params.widgetId);
        widgetsRepository.exist(storagePath + filename, function(isExist){
            if(isExist){
                widgetsRepository.removeFile(storagePath + filename, callback, errorCallback);
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
                    logger.info('Loading of widget ' + widgetList[i].widgetId + ' is started.');
                    widgetList[i].compiledData = JSON.parse(new Buffer(widgetList[i].compiledData, 'binary'));
                    widgetList[i].originData = JSON.parse(new Buffer(widgetList[i].originData,'binary'));
                    logger.info('Widget ' + widgetList[i].widgetId + ' is loaded.');
                }
                callback(widgetList);
            }, errorCallback);
        }, errorCallback);
    };
}());