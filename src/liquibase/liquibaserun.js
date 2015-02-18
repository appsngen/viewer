/**
 * Created by Ruslan_Dulina on 12/12/2014.
 */
(function () {
    'use strict';
    var storage = require('./../globalstorage').getStorage();
    var _ = require('underscore');
    _.templateSettings = {
        evaluate    : /<%%([\s\S]+?)%%>/g,
        interpolate : /<%%=([\s\S]+?)%%>/g,
        escape      : /<%%-([\s\S]+?)%%>/g
    };
    var fs   = require('fs');
    var shell, executeAdditionalCommand, executableFile, commandFilePath;
    var logger = require('./../logger/logger')(module);
    /**
     * Detect on which platform viewer is started. Windows or linux.
     */
    if (process.platform === 'win32' && process.env.SHELL === undefined) {
        shell = process.env.COMSPEC || 'cmd.exe';
        commandFilePath = (__dirname + '/comand.cmd').replace(/\\/g, '/');
        executeAdditionalCommand = false;
        executableFile = 'liquibase.bat';
        logger.info('Current OS is windows');
    }
    else{
        shell = process.env.SHELL || 'sh';
        commandFilePath = (__dirname + '/comand.sh').replace(/\\/g, '/');
        executeAdditionalCommand = true;
        executableFile = 'liquibase';
        logger.info('Current OS is linux');
    }

    /**
     * Execute platform comand
     * @param cmd process environment shell.
     * @param args command arguments.
     * @param cbEnd callback function.
     */
    exports.cmdExec = function(cmd, args, cbEnd) {
        var spawn = require('child_process').spawn,
            child = spawn(cmd, args),
            that = this;
        that.exit = 0;
        child.stdout.on('data', function (data) {
            logger.info(data.toString());
        });
        child.stdout.on('end', function () {
            cbEnd(that);
        });
        child.stderr.on('data', function (data) {
            logger.info(data.toString());
        });
    };

    exports.createComandFromTemplate = function(){
        var template = storage.staticFiles.liqubaseTemplate;
        var connectorPath = (__dirname + storage.staticFiles.mysqlConnectorJavaPath).replace(/\\/g, '/');
        var changeLogFilePath = (__dirname +  storage.staticFiles.changeLogFilePath).replace(/\\/g, '/');
        if (!fs.existsSync(connectorPath)) {
            throw new Error('mysql-connector-java not found - "' + connectorPath + '"');
        }
        if (!fs.existsSync(changeLogFilePath)) {
            throw new Error('change log file path not found - "' + changeLogFilePath + '"');
        }
        var paramsString = _.template(template.toString())({
            userName: storage.databaseConfiguration.login,
            password: storage.databaseConfiguration.password,
            databaseHost: storage.databaseConfiguration.host,
            databasePort: storage.databaseConfiguration.port,
            databaseName: storage.databaseConfiguration.name,
            dbUser: storage.databaseConfiguration.login,
            dbPassword: storage.databaseConfiguration.password,
            connectorPath: connectorPath,
            changeLogFilePath:changeLogFilePath
        });
        paramsString = paramsString.replace(/\\/g, '/');
        return paramsString;
    };

    exports.runCommand = function(callback){
        if(storage.dataProvider === 'filesystem'){
            callback();
            return;
        }
        var stringParams = this.createComandFromTemplate(), that = this;
        var paramms = [];
        /**
         * On linux platform we should prepare files for execution.
         */
        if(executeAdditionalCommand){
            paramms.unshift('sh ' + commandFilePath);
            /**
             * Give command admin rights.
             */
            var commandWithAdminRights = '#!/bin/sh \n' +__dirname + '/' + executableFile + ' ';
            fs.writeFileSync(commandFilePath, commandWithAdminRights.replace(/\\/g, '/') + stringParams);
            logger.info('Set right for execution file.');
            paramms.unshift('-c');
            /**
             * Set rights on execution for liquibase file.
             */
            that.cmdExec(shell, ['-c', 'chmod 777 ' + __dirname + '/' + executableFile], function (cmdThat) {
                    cmdThat.exit = 1;
                    /**
                     * Set rights on execution for liquibase command file.
                     */
                    that.cmdExec(shell, ['-c', 'chmod 777 ' + commandFilePath], function (cmdThat) {
                            cmdThat.exit = 1;
                            that.callLiquibase(paramms, callback);
                        }
                    );
                }
            );
        }else{
            /**
             * On windows platform we can call without additional commands.
             */
            paramms.unshift(commandFilePath);
            fs.writeFileSync(commandFilePath, (__dirname + '/' + executableFile + ' ').replace(/\\/g, '/') +
                stringParams);
            paramms.unshift('/c');
            that.callLiquibase(paramms, callback);
        }
    };

    exports.callLiquibase = function(paramms, callback){
        logger.info('Call liquibase.');
        /**
         * Call liquibase command from file.
         */
        this.cmdExec(shell, paramms, function (cmdThat) {
                cmdThat.exit = 1;
                callback();
            }
        );
    };
}());
