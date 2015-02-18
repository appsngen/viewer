/**
 * Created by Ruslan_Dulina on 9/10/2014.
 */
(function () {
    'use strict';

    var storage = require('./../globalstorage').getStorage();
    var cache = require('./../cache/cache');
    var name = 'viewer_' + storage.version + '_' + storage.host;
    var Guid = require('guid');
    var BaseRabbitMq = require('./rabbitmqbase'), logger;
    var message = 'Viewer rabbitmq subscriber is not enabled. Not all parameters specified';


    var util = require('util');

    var ViewerSubscriber = function(){
        var mainArguments = Array.prototype.slice.call(arguments);
        mainArguments.push(message);
        BaseRabbitMq.apply(this, mainArguments);
    };

    util.inherits(ViewerSubscriber, BaseRabbitMq);


    ViewerSubscriber.prototype.consumerCallback = function(message){
        var params = JSON.parse(message.content.toString());
        if(storage.id !== params.id){
            cache.updateCache(params);
        }
    };

    ViewerSubscriber.prototype.openChannel = function(callback, errorCallback, error, channel){
        var psconfig = this.configuration.publisherSubscriber;
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

    ViewerSubscriber.prototype.createConsumer = function(connection, callback, errorCallback){
        connection.createChannel(this.openChannel.bind(this, callback, errorCallback));
    };

    ViewerSubscriber.prototype.initialize = function (callback, errorCallback) {
        logger = require('./../logger/logger')(module);
        this.connectToRabbitMq(callback, errorCallback, logger, this.createConsumer.bind(this));
    };

    module.exports = new ViewerSubscriber();
}());