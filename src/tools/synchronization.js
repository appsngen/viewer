/**
 * Created by Ruslan_Dulina on 11/13/2014.
 */

(function () {
    'use strict';
    var servicesRequester = require('./../processor/modules/restservicesrequester');
    var storage = require('./../globalstorage').getStorage();
    var logger = require('./../logger/logger')(module);
    exports.getWidgetList = function(callback, errorCallback){
        var userId = storage.serviceUser;
        servicesRequester.getWidgetsList(userId, callback, errorCallback);
    };

    exports.getWidgetZip = function(widgetInfo, callback, errorCallback){
        var userId = storage.serviceUser;
        var widgetId = widgetInfo.id;
        var organizationId = widgetInfo.organizationId;
        servicesRequester.downloadWidget(userId, widgetId, organizationId, callback, errorCallback);
    };

    exports.removeAllDuplicatedWidgets = function(widgets){
        var map = [], i, j, flag;
        for(i = 0; i < widgets.length; i++){
            flag = true;
            for(j = 0; j < map.length; j++){
                if(map[j].id.split(':')[3] === widgets[i].id.split(':')[3]){
                    logger.warn('WARNING ' + widgets[i].id + ' is duplicated');
                    flag = false;
                }
            }
            if(flag === true){
                map.push(widgets[i]);
            }
        }

        return map;
    };

    exports.uploadAllWidgets = function(widgets, callback){
        logger.info('Number of downloaded widgets: ' + widgets.length);
        widgets = this.removeAllDuplicatedWidgets(widgets);
        var that = this, operationCount = widgets.length, currentOperation = 0;
        var result = {
            widgetZips: [],
            errors: 0
        };
        widgets.forEach(function(widgetInfo){
            that.getWidgetZip(widgetInfo, function(widgetSum){
                currentOperation++;
                result.widgetZips.push(widgetSum);
                if(operationCount === currentOperation){
                    callback(result);
                }
            }, function(){
                currentOperation++;
                if(operationCount === currentOperation){
                    callback(result);
                }
            });
        });
    };
}());