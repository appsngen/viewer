/**
 * Created by Ruslan_Dulina on 9/15/2014.
 */
(function () {
    'use strict';

    var WIDGET_UPDATED_TEMPLATE = 'application';
    var MOBILE_APPLICATION_UPDATED_TEMPLATE = 'mobile application';
    var ORGANIZATION_PREFERENCE_UPDATED_TEMPLATE = 'organization preference';
    var WIDGET_PREFERENCE_UPDATED_TEMPLATE = 'application preference';
    var SYSTEM_INTEGRATION_INFO_UPDATED_TEMPLATE = 'system integration info';
    var MOBILE_CONFIGURATION_UPDATED_TEMPLATE = 'mobile configuration';
    var storage = require('./../globalstorage').getStorage();
    var publisher = require('./viewerpublisher');
    var cache = require('./../cache/cache');
    var Guid = require('guid');
    var BaseRabbitMq = require('./rabbitmqbase'), logger;
    var message = 'Viewer rabbitmq RPC is not enabled. Not all parameters specified';


    var util = require('util');

    var ViewerRPC = function(){
        var mainArguments = Array.prototype.slice.call(arguments);
        mainArguments.push(message);
        BaseRabbitMq.apply(this, mainArguments);
    };

    util.inherits(ViewerRPC, BaseRabbitMq);


    ViewerRPC.prototype.answerToService = function (channel, message) {
        var correlationId = message.properties.correlationId;
        var replyTo = message.properties.replyTo;
        channel.publish(storage.rabbitMqConfiguration.rpc.exchange, replyTo, new Buffer('ok'), {
            replyTo: replyTo,
            correlationId: correlationId
        });
    };

    ViewerRPC.prototype.consumerCallback = function (channel, message) {
        var arrayMessage = message.content.toString().split('|'), that = this;
        var organizationId = arrayMessage[2], params = {}, userId = storage.serviceUser;
        switch (arrayMessage[0]) {
            case WIDGET_UPDATED_TEMPLATE :
                that.answerToService(channel, message);
                break;
            case MOBILE_APPLICATION_UPDATED_TEMPLATE :
                that.answerToService(channel, message);
                break;
            case ORGANIZATION_PREFERENCE_UPDATED_TEMPLATE :
                params = {
                    organizationId: organizationId,
                    id: storage.id,
                    type: 'globalPreferencesDeleted'
                };
                cache.deletePreferenceCache(organizationId);
                cache.deleteWidgetPreferenceCache(organizationId);
                publisher.publish(JSON.stringify(params), storage.rabbitMqConfiguration.amqpChannel);
                params.type = 'widgetPreferencesDeleted';
                publisher.publish(JSON.stringify(params), storage.rabbitMqConfiguration.amqpChannel);
                that.answerToService(channel, message);
                setTimeout(function(){
                    cache.uploadPreferenceCache(organizationId, userId, function(globalPreferences){
                        params.globalPreferences = globalPreferences;
                        params.type = 'globalPreferencesUpdated';
                        publisher.publish(JSON.stringify(params), storage.rabbitMqConfiguration.amqpChannel);
                    }, function(){});
                }, 0);
                break;
            case WIDGET_PREFERENCE_UPDATED_TEMPLATE :
                var widgetId = arrayMessage[3];
                params = {
                    organizationId: organizationId,
                    widgetId: widgetId,
                    id: storage.id,
                    type: 'widgetPreferencesDeleted'
                };
                cache.deleteWidgetPreferenceCache(organizationId, widgetId);
                publisher.publish(JSON.stringify(params), storage.rabbitMqConfiguration.amqpChannel);
                that.answerToService(channel, message);
                /**
                 * uploadWidgetPreferenceCache should be called after publish message about updating viewer state.
                 * After publishing message back-end update it's database state.
                 * channel.publish is asynchronous function.
                 */
                setTimeout(function(){
                    cache.uploadWidgetPreferenceCache(organizationId, userId, widgetId, function(widgetPreferences){
                        params.widgetId = widgetId;
                        params.widgetPreferences = widgetPreferences;
                        params.type = 'widgetPreferencesUpdated';
                        publisher.publish(JSON.stringify(params), storage.rabbitMqConfiguration.amqpChannel);
                    }, function(){
                        var guid = Guid.create();
                        var errorMessage = 'Can\'t upload widget preference cache. Organization id: ' +
                            organizationId + ' Widget id: ' + widgetId;
                        logger.error(errorMessage, {id: guid.value});
                    });
                }, 0);
                break;
            case SYSTEM_INTEGRATION_INFO_UPDATED_TEMPLATE :
                that.answerToService(channel, message);
                break;
            case MOBILE_CONFIGURATION_UPDATED_TEMPLATE :
                that.answerToService(channel, message);
                break;
        }
    };

    ViewerRPC.prototype.openChannel = function (callback, errorCallback, error, channel) {
        if (error !== null) {
            var guid = Guid.create();
            logger.error(error, {id: guid.value});
            errorCallback(error, guid.value);
        }
        channel.assertQueue(storage.rabbitMqConfiguration.rpc.name, {durable: true});
        channel.deleteQueue(storage.rabbitMqConfiguration.rpc.name);
        channel.assertQueue(storage.rabbitMqConfiguration.rpc.name, {durable: true});
        channel.consume(storage.rabbitMqConfiguration.rpc.name, this.consumerCallback.bind(this, channel), {
            noAck: true
        });
        callback();
    };

    ViewerRPC.prototype.createConsumer = function (connection, callback, errorCallback) {
        connection.createChannel(this.openChannel.bind(this, callback, errorCallback));
    };

    ViewerRPC.prototype.initialize = function (callback, errorCallback) {
        logger = require('./../logger/logger')(module);
        this.connectToRabbitMq(callback, errorCallback, logger, this.createConsumer.bind(this));
    };

    module.exports = new ViewerRPC();
}());