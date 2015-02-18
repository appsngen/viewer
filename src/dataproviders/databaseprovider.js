/**
 * Created by Ruslan_Dulina on 9/8/2014.
 */

(function () {
    'use strict';
    var widgetsRepository = require('./repositories/widgetdatabaserepository');
    var each = require('async-each-series');
    var logger = require('./../logger/logger')(module);
    exports.getWidget = function (params, callback, errorCallback){
        widgetsRepository.readInstance(params, function(data){
            if(data.length === 0){
                callback();
            }
            else{
                var element = {};
                element.widgetId = data[0].WidgetId;
                element.compiledData = JSON.parse(new Buffer(data[0].CompiledData, 'binary'));
                element.originData = JSON.parse(new Buffer(data[0].OriginData,'binary'));
                callback(element);
            }
        }, errorCallback);
    };

    exports.checkWidgetExistence = function (params, callback, errorCallback){
        widgetsRepository.readInstance(params, function(data){
            if(data.length === 0){
                callback(false);
            }
            else{
                var element = {};
                element.widgetId = data[0].WidgetId;
                element.compiledData = JSON.parse(new Buffer(data[0].CompiledData, 'binary'));
                element.originData = JSON.parse(new Buffer(data[0].OriginData,'binary'));
                callback(true, element);
            }
        }, errorCallback);
    };

    exports.saveWidget = function (zip, originZip, xml, callback, errorCallback) {
        var params = {
            widgetId: xml.widgetId,
            compiledData: zip,
            originData: originZip
        };

        this.checkWidgetExistence(params, function(isExist){
            if(isExist){
                widgetsRepository.updateInstance(params, callback, errorCallback);
            }
            else{
                widgetsRepository.createInstance(params, callback, errorCallback);
            }
        }, errorCallback);
    };

    exports.deleteWidget = function (params, callback, errorCallback) {
        widgetsRepository.deleteInstance(params, callback, errorCallback);
    };

    exports.getAllWidgets = function(callback, errorCallback){
        var that = this, widgets = [], params = {}, widgetCurrentIdx = 0;
        widgetsRepository.readAllInstancesIdx(function(widgetsIdx){
            logger.info('In database now ' + widgetsIdx.length + ' widgets');
            each(widgetsIdx, function (widgetIdx, next) {
                widgetCurrentIdx++;
                logger.info(widgetCurrentIdx + ') '+ widgetIdx.WidgetId);
                logger.info('Downloaded of widget ' + widgetIdx.WidgetId + ' is started.');
                params.widgetId = widgetIdx.WidgetId;
                that.getWidget(params, function(element) {
                    widgets.push(element);
                    logger.info('Widget ' + widgetIdx.WidgetId + ' is downloaded.');
                    next();
                }, errorCallback);
            }, function(error){
                if(error){
                    errorCallback();
                }
                else{
                    callback(widgets);
                }
            });
        }, errorCallback);
    };
}());
