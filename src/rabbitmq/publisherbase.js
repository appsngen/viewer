/**
 * Created by Ruslan_Dulina on 2/13/2015.
 */

/**
 * Created by Ruslan_Dulina on 2/13/2015.
 */

(function () {
    'use strict';

    var Guid = require('guid');
    var BaseRabbitMq = require('./rabbitmqbase');

    var util = require('util');

    var BasePublisher = function(config){
        var mainArguments = Array.prototype.slice.call(arguments);
        mainArguments.reverse();
        BaseRabbitMq.apply(this, mainArguments);
        this.config = config;
    };

    util.inherits(BasePublisher, BaseRabbitMq);

    BasePublisher.prototype.publish = function(message, channel){
        try{
            if(typeof (message) === 'string'){
                message = new Buffer(message);
            }
            channel.publish(this.config.exchange,
                this.config.routingKey,
                message,
                {
                    persistent: 1,
                    deliveryMode: 2
                });
        }
        catch (ex){
            /**
             * if graylog publisher it's impossible to log error here because graylog publisher is not created.
             * It will cause recursive logging of errors.
             * But logger of graylog publisher doesn't contain graylog transport,
             * so we can log it in file and console transport
             */
            var guid = Guid.create();
            this.logger.error(ex, {id: guid.value});
            return false;
        }

        return true;
    };

    module.exports = BasePublisher;
}());