/**
 * Created by Ruslan_Dulina on 2/12/2015.
 */
(function () {
    'use strict';
    var storage = require('./../globalstorage').getStorage();
    var logger = require('./../logger/logger')(module);
    var repository;
    if (storage.dataProvider === 'filesystem') {
        repository = require('./filesystemprovider');
        logger.warn('Viewer will be use file systems for all manipulations with widgets');
    }
    else {
        repository = require('./databaseprovider');
    }

    module.exports = {
        getWidget: repository.getWidget,
        checkWidgetExistence: repository.checkWidgetExistence,
        saveWidget: repository.saveWidget,
        deleteWidget: repository.deleteWidget,
        getAllWidgets: repository.getAllWidgets
    };
}());