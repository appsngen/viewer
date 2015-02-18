/**
 * Created by Ruslan_Dulina on 9/17/2014.
 */

(function () {
    'use strict';
    var servicesRequester = require('./../processor/modules/services/iservicerequester');
    var storage = require('./../globalstorage').getStorage();

    exports.generateKey = function (organizationId, widgetId) {
        var result = organizationId.replace(/\./g,'-') + '.' +
            widgetId.replace(/\./g,'-');
        return result;
    };

    exports.updateCache = function (widgetPreferences, widgetId, organizationId) {
        var key = this.generateKey(organizationId, widgetId);
        storage.cache.widgetPreferencesCache[key] = widgetPreferences;
        storage.cache.widgetPreferencesCache[key + 'timestamp'] = new Date().getTime();
    };

    exports.loadCache = function (organizationId, userId, widgetId, callback, errorCallback) {
        var key = this.generateKey(organizationId, widgetId);
        servicesRequester.getWidgetPreferences(organizationId, userId, widgetId, function (widgetPreferences) {
            storage.cache.widgetPreferencesCache[key] = widgetPreferences;
            storage.cache.widgetPreferencesCache[key + 'timestamp'] = new Date().getTime();
            callback(widgetPreferences);
        }, errorCallback);
    };

    exports.deleteCache = function (organizationId, widgetId) {
        if(widgetId){
            var key = this.generateKey(organizationId, widgetId);
            delete storage.cache.widgetPreferencesCache[key];
            delete storage.cache.widgetPreferencesCache[key + 'timestamp'];
        }
        else{
            for(var widgetPreferenceInstance in storage.cache.widgetPreferencesCache){
                if (storage.cache.widgetPreferencesCache.hasOwnProperty(widgetPreferenceInstance) &&
                    widgetPreferenceInstance.split('.')[0] === organizationId) {
                    delete storage.cache.widgetPreferencesCache[widgetPreferenceInstance];
                    delete storage.cache.widgetPreferencesCache[widgetPreferenceInstance + 'timestamp'];
                }
            }
        }
    };

    exports.getWidgetPreferences = function (orgId, userId, widgetId, callback, errorCallback) {
        var key = this.generateKey(orgId, widgetId), timestamp, timeNow;
        if(storage.cache.widgetPreferencesCache[key]){
            timestamp = storage.cache.widgetPreferencesCache[key + 'timestamp'];
            callback(storage.cache.widgetPreferencesCache[key], timestamp);
        }
        else{
            servicesRequester.getWidgetPreferences(orgId, userId, widgetId, function (widgetPreferences) {
                storage.cache.widgetPreferencesCache[key] = widgetPreferences;
                timeNow = new Date().getTime();
                storage.cache.widgetPreferencesCache[key + 'timestamp'] = timeNow;
                callback(storage.cache.widgetPreferencesCache[key], timeNow);
            }, errorCallback);
        }
    };
}());
