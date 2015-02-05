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
    var configuration = storage.rabbitMqConfiguration;
    var logger = require('./../logger/logger')(module);
    var ampq = require('./../../node_modules/amqplib/callback_api');
    var publisher = require('./viewerpublisher');
    var cache = require('./../cache/cache');
    var Guid = require('guid');

    exports.answerToService = function (channel, message) {
        var correlationId = message.properties.correlationId;
        var replyTo = message.properties.replyTo;
        channel.publish(configuration.rpc.exchange, replyTo, new Buffer('ok'), {
            replyTo: replyTo,
            correlationId: correlationId
        });
    };

    exports.consumerCallback = function (channel, message) {
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
                publisher.publish(params, storage.rabbitMqConfiguration.amqpChannel);
                params.type = 'widgetPreferencesDeleted';
                publisher.publish(params, storage.rabbitMqConfiguration.amqpChannel);
                that.answerToService(channel, message);
                setTimeout(function(){
                    cache.uploadPreferenceCache(organizationId, userId, function(globalPreferences){
                        params.globalPreferences = globalPreferences;
                        params.type = 'globalPreferencesUpdated';
                        publisher.publish(params, storage.rabbitMqConfiguration.amqpChannel);
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
                publisher.publish(params, storage.rabbitMqConfiguration.amqpChannel);
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
                        publisher.publish(params, storage.rabbitMqConfiguration.amqpChannel);
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

    exports.openChannel = function (callback, errorCallback, error, channel) {
        if (error !== null) {
            var guid = Guid.create();
            logger.error(error, {id: guid.value});
            errorCallback(error, guid.value);
        }
        channel.assertQueue(configuration.rpc.name, {durable: true});
        channel.deleteQueue(configuration.rpc.name);
        channel.assertQueue(configuration.rpc.name, {durable: true});
        channel.consume(configuration.rpc.name, this.consumerCallback.bind(this, channel), {noAck: true});
        callback();
    };

    exports.consumer = function (connection, callback, errorCallback) {
        connection.createChannel(this.openChannel.bind(this, callback, errorCallback));
    };

    exports.initialize = function (callback, errorCallback) {
        var that = this, url;
        if(!configuration.protocol || !configuration.login ||
            !configuration.password || !configuration.host || !configuration.port){
            logger.warn('viewer rabbitmq RPC is not enabled. Not all parameters specified', configuration);
            callback();
        }
        else{
            url = configuration.protocol + '://' + configuration.login + ':' + configuration.password + '@' +
                configuration.host + ':' + configuration.port;
            ampq.connect(url, function (error, connection) {
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