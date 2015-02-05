/**
 * Created by Ruslan_Dulina on 10/2/2014.
 */
(function () {
    'use strict';
    var fs = require('fs');
    var loggerConfiguration = JSON.parse(fs.readFileSync(__dirname + '/../serverconfig.json')).grayLog;
    var storage = require('./../globalstorage').getStorage();
    var publisher = require('./../rabbitmq/graylogpublisher');
    var msgpack;
    if(loggerConfiguration.messageFormat && loggerConfiguration.messageFormat === 'Radio'){
        msgpack = require('msgpack');
    }
    var levels = {
        alert: 1,
        critical: 2,
        error: 3,
        warn: 4,
        notice: 5,
        info: 6,
        debug: 7
    };
    exports.getLevel = function (level) {
        return levels[level];
    };

    exports.constructGelfMessage = function (level, msg, meta, transport) {
        var message = {
            facility: 'widget_viewer',
            file: transport.label,
            /* jshint camelcase: false */
            full_message: msg,
            /* jshint camelcase: true */
            host: storage.host,
            level: level,
            line: '',
            /* jshint camelcase: false */
            short_message: msg.substring(0, 120),
            /* jshint camelcase: true */
            timestamp: new Date().getTime(),
            version: storage.grayLog.gelfVersion,
            _id: meta.id
        };

        message = JSON.stringify(message);
        message = new Buffer(message);
        return message;
    };

    exports.sendMessage = function(message){
        var channel = storage.rabbitMqConfiguration.grayLogChannel;
        publisher.publish(message, channel);
    };

    exports.constructRadioMessage = function(level, msg, meta){
        var message = [
            {
                message: msg.substring(0, 120),
                source: 'widget viewer',
                _id: meta.id,
                /* jshint camelcase: false */
                full_message: msg,
                /* jshint camelcase: true */
                host: storage.host
            },
            {
                level: level
            },
            {
            },
            new Date().getTime()
        ];
        message = msgpack.pack(message);
        return message;
    };

    exports.log = function (level, msg, meta, transport) {
        var message, numberLevel;
        numberLevel = this.getLevel(level);
        switch (storage.grayLog.messageFormat) {
            case 'GELF':
                message = this.constructGelfMessage(numberLevel, msg, meta, transport);
                this.sendMessage(message);
                break;
            case 'Radio':
                message = this.constructRadioMessage(numberLevel, msg, meta);
                this.sendMessage(message);
                break;
        }
    };
}());