/**
 * Created by Ruslan_Dulina on 2/12/2015.
 */

(function () {
    'use strict';
    var storage = require('./../../../globalstorage').getStorage();
    var restserviceConfig;
    var repository = require('./../../../dataproviders/iprovider');
    var BaseServiceRequester = require('./baseservicerequester');
    var util = require('util');

    var StubServiceRequester = function(){
        restserviceConfig = storage.restserviceConfig;
        BaseServiceRequester.apply(this, arguments);
    };

    util.inherits(StubServiceRequester, BaseServiceRequester);

    StubServiceRequester.prototype.getPreferences = function (organizationId, userId, callback) {
        var globalPreferences = {};
        globalPreferences.lastModifiedPreferences = new Date(2000, 1, 1).getTime();
        globalPreferences.organizationPreferences = {};
        callback(globalPreferences);
    };

    StubServiceRequester.prototype.getWidgetPreferences = function (orgId, userId, widgetId, callback, errorCallback) {
        var widgetPreferences, formattedWidgetPreferences = [], formattedItem, i;
        repository.getWidget({widgetId: widgetId}, function(widget){
            widgetPreferences = widget.compiledData.xml.preferences;
            for(var property in widgetPreferences) {
                if (widgetPreferences.hasOwnProperty(property)) {
                    formattedItem = {
                        key: property,
                        value: widgetPreferences[property].value,
                        meta: {
                            availableValues: []
                        }
                    };
                    for (i = 0; i < widgetPreferences[property].possibleValues.length; i++) {
                        formattedItem.meta.availableValues.push({
                            value: widgetPreferences[property].possibleValues[i]
                        });
                    }
                    formattedWidgetPreferences.push(formattedItem);
                }
            }
            callback(formattedWidgetPreferences);
        }, errorCallback);
    };

    StubServiceRequester.prototype.getServiceToken = function (services, userId, callback) {
        var accessToken = 'STUB_TOKEN';
        var expiresIn = new Date(2000,1,1).getTime();
        callback(accessToken, expiresIn);
    };

    StubServiceRequester.prototype.widgetUpload = function (query, body, callback) {
        var response = {
            stub: true
        }, status = 201;
        callback(response, status);
    };

    StubServiceRequester.prototype.widgetUpdate = function (query, body, callback) {
        var response = {
            stub: true
        }, status = 200;
        callback(response, status);
    };

    StubServiceRequester.prototype.widgetDelete = function (widgetId, userId, orgId, callback) {
        var response = {
            message: widgetId + ' has been removed successfully'
        }, status = 200;
        callback(response, status);
    };

    module.exports = StubServiceRequester;
}());