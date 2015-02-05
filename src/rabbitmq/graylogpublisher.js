/**
 * Created by Ruslan_Dulina on 10/2/2014.
 */
/**
 * Created by Ruslan_Dulina on 9/10/2014.
 */
(function () {
    'use strict';
    var storage = require('./../globalstorage').getStorage();
    var ampq = require('./../../node_modules/amqplib/callback_api');

    exports.openChannel = function(callback, errorCallback, error, channel){
        if(error !== null){
            errorCallback(error);
        }

        callback(channel);
    };

    exports.publish = function(message, channel){
        var configuration = storage.rabbitMqConfiguration;
        try{
            channel.publish(configuration.grayLogPublisher.exchange,
                configuration.grayLogPublisher.routingKey,
                message,
                {
                    persistent: true,
                    deliveryMode: 2
                });
        }
        catch (ex){
            /**
             * it's impossible to log error here because graylog publisher is not created.
             * It will cause recursive logging of errors.
             */
            return false;
        }
        return true;
    };

    exports.cratePublisher = function(connection, callback, errorCallback){
        connection.createChannel(this.openChannel.bind(this, callback, errorCallback));
    };

    exports.initialize = function (callback, errorCallback) {
        var that = this, connectionUrl;
        var configuration = storage.rabbitMqConfiguration;
        if(!configuration.protocol || !configuration.login ||
            !configuration.password || !configuration.host || !configuration.port){
            console.log('Rabbitmq graylog publisher is not enabled. Not all parameters specified', configuration);
            callback();
        }
        else{
            connectionUrl = configuration.protocol + '://' + configuration.login +':' +configuration.password + '@' +
                configuration.host + ':' + configuration.port + '/' + configuration.vhost;
            ampq.connect(connectionUrl, function (error, connection) {
                if (error !== null) {
                    errorCallback(error);
                }
                that.cratePublisher(connection, callback, errorCallback);
            });
        }
    };
}());