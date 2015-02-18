/**
 * Created by Ruslan_Dulina on 2/13/2015.
 */

(function () {
    'use strict';

    var storage = require('./../globalstorage').getStorage();
    var ampq = require('./../../node_modules/amqplib/callback_api');
    var Guid = require('guid');

    var BaseRabbitmq = function(message){
        this.message = message;
    };

    BaseRabbitmq.prototype.connectToRabbitMq = function (callback, errorCallback, logger, creator) {
        var that = this, url, config;
        this.logger = logger;
        this.configuration = storage.rabbitMqConfiguration;
        config = this.configuration;
        if(!config.protocol || !config.login || !config.password || !config.host || !config.port){
            logger.warn(that.message, config);
            callback();
        }
        else{
            url = config.protocol + '://' + config.login +':' +config.password + '@' + config.host + ':' +
                config.port + '/' + config.vhost;
            ampq.connect(url, function (error, connection) {
                if (error !== null) {
                    var guid = Guid.create();
                    logger.error(error, {id: guid.value});
                    errorCallback(error, guid.value);
                }
                creator(connection, callback, errorCallback);
            });
        }
    };

    module.exports = BaseRabbitmq;
}());