/**
 * Created by Ruslan_Dulina on 2/12/2015.
 */

(function () {
    'use strict';
    var storage = require('./../../../globalstorage').getStorage();
    var ProcessorConfiguration;
    if (storage.restserviceConfig.type === 'real') {
        ProcessorConfiguration = require('./defaultprocessorconfiguration');
    }
    else{
        ProcessorConfiguration = require('./stubprocessorconfiguration');
    }

    ProcessorConfiguration = new ProcessorConfiguration();

    module.exports = ProcessorConfiguration;
}());