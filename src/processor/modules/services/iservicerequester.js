/**
 * Created by Ruslan_Dulina on 2/12/2015.
 */
(function () {
    'use strict';
    var storage = require('./../../../globalstorage').getStorage();
    var logger = require('./../../../logger/logger')(module);
    var ServiceRequester;
    if (storage.restserviceConfig.type === 'real') {
        ServiceRequester = require('./restservicesrequester');
    }
    else {
        ServiceRequester = require('./stubservicerequester');
        logger.warn('Viewer will be use stub services for all ' +
            'manipulations with widgets except getting token for datasources');
    }

    ServiceRequester = new ServiceRequester();

    module.exports = {
        getPreferences: ServiceRequester.getPreferences,
        getWidgetsList: ServiceRequester.getWidgetsList,
        downloadWidget: ServiceRequester.downloadWidget,
        getWidgetPreferences: ServiceRequester.getWidgetPreferences,
        sendRequest: ServiceRequester.sendRequest,
        getTokenOptions: ServiceRequester.getTokenOptions,
        getToken: ServiceRequester.getToken,
        getServiceToken: ServiceRequester.getServiceToken,
        widgetUpload: ServiceRequester.widgetUpload,
        widgetUpdate: ServiceRequester.widgetUpdate,
        widgetDelete: ServiceRequester.widgetDelete
    };
}());