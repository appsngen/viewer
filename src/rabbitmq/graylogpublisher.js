/**
 * Created by Ruslan_Dulina on 10/2/2014.
 */
(function () {
    'use strict';
    module.id = 'graylogpublisher';
    var Guid = require('guid'), logger;
    var BasePublisher = require('./publisherbase');
    var message = 'Rabbitmq graylog publisher is not enabled. Not all parameters specified';
    var JSONC = require('comment-json');
    var fs = require('fs');
    var storage = JSONC.parse(fs.readFileSync(__dirname + '/../serverconfig.json'));

    var util = require('util');

    var GraylogPublisher = function(){
        var mainArguments = Array.prototype.slice.call(arguments);
        mainArguments.push(message);
        BasePublisher.apply(this, mainArguments);
    };

    util.inherits(GraylogPublisher, BasePublisher);

    GraylogPublisher.prototype.openChannel = function(callback, errorCallback, error, channel){
        if(error !== null){
            var guid = Guid.create();
            logger.error(error, {id: guid.value});
            errorCallback(error, guid.value);
        }

        callback(channel);
    };

    GraylogPublisher.prototype.cratePublisher = function(connection, callback, errorCallback){
        connection.createChannel(this.openChannel.bind(this, callback, errorCallback));
    };

    GraylogPublisher.prototype.initialize = function (callback, errorCallback) {
        logger = require('./../logger/logger')(module);
        this.connectToRabbitMq(callback, errorCallback, logger, this.cratePublisher.bind(this));
    };

    module.exports = new GraylogPublisher(storage.rabbitMqConfiguration.graylogPublisher);
}());