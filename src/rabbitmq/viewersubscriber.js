/**
 * Created by Ruslan_Dulina on 9/10/2014.
 */
(function () {
    'use strict';

    var storage = require('./../globalstorage').getStorage();
    var configuration = storage.rabbitMqConfiguration;
    var logger = require('./../logger/logger')(module);
    var cache = require('./../cache/cache');
    var ampq = require('./../../node_modules/amqplib/callback_api');
    var name = 'viewer_' + storage.version + '_' + storage.host;
    var Guid = require('guid');

    exports.consumerCallback = function(message){
        var params = JSON.parse(message.content.toString());
        if(storage.id !== params.id){
            cache.updateCache(params);
        }
    };

    exports.openChannel = function(callback, errorCallback, error, channel){
        var psconfig = configuration.publisherSubscriber;
        if(error !== null){
            var guid = Guid.create();
            logger.error(error, {id: guid.value});
            errorCallback(error, guid.value);
        }
        channel.assertExchange(psconfig.exchange, 'direct', {durable: true});
        channel.assertQueue(name, {durable: true});
        channel.bindQueue(name, psconfig.exchange, psconfig.routingKey);
        channel.consume(name, this.consumerCallback.bind(this), {noAck :true});
        callback();
    };

    exports.consumer = function(connection, callback, errorCallback){
        connection.createChannel(this.openChannel.bind(this, callback, errorCallback));
    };

    exports.initialize = function (callback, errorCallback) {
        var that = this, connectionUrl;
        if(!configuration.protocol || !configuration.login ||
            !configuration.password || !configuration.host || !configuration.port){
            logger.warn('viewer rabbitmq subscriber is not enabled. Not all parameters specified', configuration);
            callback();
        }
        else{
            connectionUrl = configuration.protocol + '://' + configuration.login +':' + configuration.password + '@' +
                configuration.host + ':' + configuration.port;
            ampq.connect(connectionUrl, function (error, connection) {
                if (error !== null) {
                    var guid = Guid.create();
                    logger.error(error, {id: guid.value});
                    errorCallback(error, guid.value);
                }
                that.consumer(connection, callback, errorCallback);
            });
        }
    };
}());