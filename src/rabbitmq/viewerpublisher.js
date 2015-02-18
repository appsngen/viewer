/**
 * Created by Ruslan_Dulina on 9/10/2014.
 */
(function () {
    'use strict';

    var Guid = require('guid');
    var BasePublisher = require('./publisherbase'), logger;
    var message = 'Viewer rabbitmq publisher is not enabled. Not all parameters specified';
    var storage = require('./../globalstorage').getStorage();

    var util = require('util');

    var ViewerPublisher = function(){
        var mainArguments = Array.prototype.slice.call(arguments);
        mainArguments.push(message);
        BasePublisher.apply(this, mainArguments);
    };

    util.inherits(ViewerPublisher, BasePublisher);

    ViewerPublisher.prototype.openChannel = function(callback, errorCallback, error, channel){
        if(error !== null){
            var guid = Guid.create();
            logger.error(error, {id: guid.value});
            errorCallback(error, guid.value);
        }
        channel.assertExchange(this.configuration.publisherSubscriber.exchange, 'direct', {durable: true});
        callback(channel);
    };


    ViewerPublisher.prototype.cratePublisher = function(connection, callback, errorCallback){
        connection.createChannel(this.openChannel.bind(this, callback, errorCallback));
    };

    ViewerPublisher.prototype.initialize = function (callback, errorCallback) {
        logger = require('./../logger/logger')(module);
        this.connectToRabbitMq(callback, errorCallback, logger, this.cratePublisher.bind(this));
    };

    module.exports = new ViewerPublisher(storage.rabbitMqConfiguration.publisherSubscriber);
}());
