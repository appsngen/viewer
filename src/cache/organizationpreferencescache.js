/**
 * Created by Ruslan_Dulina on 9/15/2014.
 */
(function () {
    'use strict';
    var servicesRequester = require('./../processor/modules/restservicesrequester');
    var storage = require('./../globalstorage').getStorage();
    
    exports.updateCache = function (globalPreferences, organizationId) {
        storage.cache.organizationPreferencesCache[organizationId] = globalPreferences;
    };

    exports.loadCache = function (organizationId, userId, callback, errorCallback) {
        servicesRequester.getPreferences(organizationId, userId, function (globalPreferences) {
            storage.cache.organizationPreferencesCache[organizationId] = globalPreferences;
            callback(globalPreferences);
        }, errorCallback);
    };

    exports.deleteCache = function (organizationId) {
        delete storage.cache.organizationPreferencesCache[organizationId];
    };

    exports.getPreferences = function (organizationId, userId, callback, errorCallback) {
        if(storage.cache.organizationPreferencesCache[organizationId]){
            callback(storage.cache.organizationPreferencesCache[organizationId]);
        }
        else{
            servicesRequester.getPreferences(organizationId, userId, function (globalPreferences) {
                storage.cache.organizationPreferencesCache[organizationId] = globalPreferences;
                callback(globalPreferences);
            }, errorCallback);
        }
    };
}());