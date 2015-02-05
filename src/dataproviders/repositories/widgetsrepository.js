/**
 * Created by Ruslan_Dulina on 9/8/2014.
 */
/**
 * Created by Ruslan_Dulina on 9/8/2014.
 */

(function () {
    'use strict';
    var storage = require('./../../globalstorage').getStorage();
    var logger = require('./../../logger/logger')(module);
    var mysql      = require('mysql');
    var pool  = mysql.createPool({
        host     : storage.databaseConfiguration.host,
        user     : storage.databaseConfiguration.login,
        password : storage.databaseConfiguration.password,
        port     : storage.databaseConfiguration.port
    });
    var Guid = require('guid');

    exports.execute = function(params, query, callback, errorCallback){
        pool.getConnection(function(error, connection) {
            if (error) {
                var guid = Guid.create();
                logger.error(error, {id: guid.value});
                errorCallback(error, guid.value);
            }
            else{
                connection.query(query, params, function(error, result) {
                    if(error){
                        var guid = Guid.create();
                        logger.error(error, {id: guid.value});
                        connection.release();
                        errorCallback(error, guid.value);
                    }
                    else{
                        connection.release();
                        callback(result);
                    }
                });
            }
        });
    };

    exports.readInstance = function (params, callback, errorCallback) {
        var query = 'SELECT * ' +
            'FROM `viewer`.`widgets` ' +
            'WHERE `viewer`.`widgets`.`WidgetId` = ? ';
        var paramsArray = [
            params.widgetId
        ];
        this.execute(paramsArray, query, callback, errorCallback);
    };

    exports.createInstance = function (params, callback, errorCallback) {
        var query = 'INSERT INTO `viewer`.`widgets` (`WidgetId`, `CompiledData`, `OriginData`) VALUES (?, ?, ?)';
        var paramsArray = [
            params.widgetId,
            params.compiledData,
            params.originData
        ];
        this.execute(paramsArray, query, callback, errorCallback);
    };

    exports.updateInstance = function (params, callback, errorCallback) {
        var query = 'UPDATE `viewer`.`widgets` SET `OriginData`= ?, `CompiledData` = ? ' +
            'WHERE `viewer`.`widgets`.`WidgetId` = ? ';
        var paramsArray = [
            params.originData,
            params.compiledData,
            params.widgetId
        ];
        this.execute(paramsArray, query, callback, errorCallback);
    };

    exports.deleteInstance = function (params, callback, errorCallback) {
        var query = 'DELETE FROM `viewer`.`widgets` WHERE `viewer`.`widgets`.`WidgetId` = ? ';
        var paramsArray = [
            params.widgetId
        ];

        this.execute(paramsArray, query, callback, errorCallback);
    };

    exports.readAllInstances = function (callback, errorCallback) {
        var query = 'SELECT * FROM `viewer`.`widgets`';
        var paramsArray = [];
        this.execute(paramsArray, query, callback, errorCallback);
    };

    exports.readAllInstancesIdx = function (callback, errorCallback) {
        var query = 'SELECT `viewer`.`widgets`.`WidgetId` FROM `viewer`.`widgets`';
        var paramsArray = [];
        this.execute(paramsArray, query, callback, errorCallback);
    };
}());
