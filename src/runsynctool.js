/**
 * Created by Ruslan_Dulina on 11/17/2014.
 */

(function () {
    'use strict';
    require('events').EventEmitter.prototype._maxListeners = 20;
    var serverConfig = require('./serverconfiguration');
    var  initServer = function() {
        var routers = require('./routers/router'),
            logger = require('./logger/logger')(module),
            Guid = require('guid');

        process.on('uncaughtException', function (err) {
            var guid = Guid.create();
            logger.error(err, err.message, err.stack, {id: guid.value});
        });

        routers.synchronize();
    };

    serverConfig.readServerConfig(initServer);
}());


