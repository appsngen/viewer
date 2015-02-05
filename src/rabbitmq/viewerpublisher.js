/**
 * Created by Ruslan_Dulina on 9/10/2014.
 */
(function () {
    'use strict';

    var storage = require('./../globalstorage').getStorage();
    var configuration = storage.rabbitMqConfiguration;
    var logger = require('./../logger/logger')(module);
    var ampq = require('./../../node_modules/amqplib/callback_api');
    var Guid = require('guid');

    exports.openChannel = function(callback, errorCallback, error, channel){
        if(error !== null){
            var guid = Guid.create();
            logger.error(error, {id: guid.value});
            errorCallback(error, guid.value);
        }
        channel.assertExchange(configuration.publisherSubscriber.exchange, 'direct', {durable: true});
        callback(channel);
    };

    exports.publish = function(message, channel){
        try{
            message = new Buffer(JSON.stringify(message));
            channel.publish(configuration.publisherSubscriber.exchange,
                configuration.publisherSubscriber.routingKey,
                message,
                {
                    persistent: 1,
                    deliveryMode: 2
                });
        }
        catch (ex){
            var guid = Guid.create();
            logger.error(ex, {id: guid.value});
            return false;
        }

        return true;
    };

    exports.cratePublisher = function(connection, callback, errorCallback){
        connection.createChannel(this.openChannel.bind(this, callback, errorCallback));
    };

    exports.initialize = function (callback, errorCallback) {
        var that = this, connectionUrl;
        if(!configuration.protocol || !configuration.login ||
            !configuration.password || !configuration.host || !configuration.port){
            logger.warn('viewer rabbitmq publisher is not enabled. Not all parameters specified', configuration);
            callback();
        }
        else{
            connectionUrl = configuration.protocol + '://' + configuration.login +':' +configuration.password + '@' +
                configuration.host + ':' + configuration.port;
            ampq.connect(connectionUrl, function (error, connection) {
                if (error !== null) {
                    var guid = Guid.create();
                    logger.error(error, {id: guid.value});
                    errorCallback(error, guid.value);
                }
                that.cratePublisher(connection, callback, errorCallback);
            });
        }
    };
}());