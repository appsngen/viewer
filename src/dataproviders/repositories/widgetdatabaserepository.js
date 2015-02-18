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
    var mysql = require('mysql');
    var pool = mysql.createPool({
        host: storage.databaseConfiguration.host,
        user: storage.databaseConfiguration.login,
        password: storage.databaseConfiguration.password,
        port: storage.databaseConfiguration.port
    });
    var databaseName = storage.databaseConfiguration.name;
    var Guid = require('guid');

    exports.execute = function (params, query, callback, errorCallback) {
        pool.getConnection(function (error, connection) {
            if (error) {
                var guid = Guid.create();
                logger.error(error, {id: guid.value});
                errorCallback(error, guid.value);
            }
            else {
                connection.query(query, params, function (error, result) {
                    if (error) {
                        var guid = Guid.create();
                        logger.error(error, {id: guid.value});
                        connection.release();
                        errorCallback(error, guid.value);
                    }
                    else {
                        connection.release();
                        callback(result);
                    }
                });
            }
        });
    };

    exports.readInstance = function (params, callback, errorCallback) {
        var query = 'SELECT * ' +
            'FROM `' + databaseName + '`.`widgets` ' +
            'WHERE `' + databaseName + '`.`widgets`.`WidgetId` = ? ';
        var paramsArray = [
            params.widgetId
        ];
        this.execute(paramsArray, query, callback, errorCallback);
    };

    exports.createInstance = function (params, callback, errorCallback) {
        var query = 'INSERT INTO `' + databaseName +
            '`.`widgets` (`WidgetId`, `CompiledData`, `OriginData`) VALUES (?, ?, ?)';
        var paramsArray = [
            params.widgetId,
            params.compiledData,
            params.originData
        ];
        this.execute(paramsArray, query, callback, errorCallback);
    };

    exports.updateInstance = function (params, callback, errorCallback) {
        var query = 'UPDATE `' + databaseName + '`.`widgets` SET `OriginData`= ?, `CompiledData` = ? ' +
            'WHERE `' + databaseName + '`.`widgets`.`WidgetId` = ? ';
        var paramsArray = [
            params.originData,
            params.compiledData,
            params.widgetId
        ];
        this.execute(paramsArray, query, callback, errorCallback);
    };

    exports.deleteInstance = function (params, callback, errorCallback) {
        var query = 'DELETE FROM `' + databaseName +
            '`.`widgets` WHERE `' + databaseName + '`.`widgets`.`WidgetId` = ? ';
        var paramsArray = [
            params.widgetId
        ];

        this.execute(paramsArray, query, callback, errorCallback);
    };

    exports.readAllInstances = function (callback, errorCallback) {
        var query = 'SELECT * FROM `' + databaseName + '`.`widgets`';
        var paramsArray = [];
        this.execute(paramsArray, query, callback, errorCallback);
    };

    exports.readAllInstancesIdx = function (callback, errorCallback) {
        var query = 'SELECT `' + databaseName +
            '`.`widgets`.`WidgetId` FROM `' + databaseName + '`.`widgets`';
        var paramsArray = [];
        this.execute(paramsArray, query, callback, errorCallback);
    };
}());
