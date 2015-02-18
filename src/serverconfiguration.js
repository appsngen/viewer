/**
 * Created by Ruslan_Dulina on 8/29/2014.
 */

(function () {
    'use strict';
    var repository = require('./dataproviders/repositories/widgetsfilesystemrepository'),
        portscanner = require('portscanner');
    var JSONC = require('comment-json');
    var storage = require('./globalstorage');
    var fullStorage = storage.getStorage();

    exports.createCache = function(callback){
        var cacheUpdater = require('./cache/cache');
        cacheUpdater.createCache(callback, function(){
            throw 'Unable to create viewer cache.';
        });
    };

    exports.readStaticData = function(filename, callback){
        var that = this;
        repository.readFile(filename, function (data) {
            try {
                var parsedData = JSONC.parse(data);
                storage.setStorage(parsedData);
                that.initializeRabbitMQ(function(channel, graylogChannel){
                    fullStorage.rabbitMqConfiguration.amqpChannel = channel;
                    fullStorage.rabbitMqConfiguration.graylogChannel = graylogChannel;
                    var liquibase = require('./liquibase/liquibaserun');
                    liquibase.runCommand(function(){
                        portscanner.checkPortStatus(fullStorage.portHttp, fullStorage.host,
                            function (errorhttp, statushttp) {
                                portscanner.checkPortStatus(fullStorage.portHttps, fullStorage.host,
                                    function (errorhttps, statushttps) {
                                        var params = {
                                            viewerHost: fullStorage.host,
                                            viewerPortHttp: fullStorage.portHttp,
                                            viewerPortHttps: fullStorage.portHttps,
                                            statushttp: statushttp,
                                            statushttps: statushttps,
                                            options: fullStorage.httpsOption
                                        };
                                        callback(params);
                                    });
                            });
                    });
                });
            } catch (ex) {
                throw 'Unable parsed server config.';
            }
        }, function () {
            throw 'Unable read server config.';
        });
    };

    exports.initializeRabbitMQ = function(callback){
        var consumer = require('./rabbitmq/viewersubscriber'),
            publisher = require('./rabbitmq/viewerpublisher'),
            rpcportal = require('./rabbitmq/rpcportal'),
            graylogpublisger = require('./rabbitmq/graylogpublisher');
        consumer.initialize(function(){
            publisher.initialize(function(data){
                rpcportal.initialize(function(){
                    graylogpublisger.initialize(function(channel){
                        callback(data, channel);
                    },function(){
                        throw 'Unable to create RabbitMQ client graylog';
                    });

                }, function(){
                    throw 'Unable to create RabbitMQ client rpc portal';
                });
            }, function(){
                throw 'Unable to create RabbitMQ client consumer';
            });
        }, function(){
            throw 'Unable to create RabbitMQ client publisher';
        });
    };

    exports.readServerConfig = function (callback) {
        var filename = 'serverconfig.json', that = this;
        that.readStaticData(filename, function(params) {
            that.createCache(function () {
                callback(params);
            });
        });
    };
}());
