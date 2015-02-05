/**
 * Created by Ruslan_Dulina on 7/7/2014.
 */
(function () {
    'use strict';
    require('newrelic');
    /**
     * node js warning: possible EventEmitter memory leak detected. 11 listeners added
     * more then 11 modules used logger module.
     * @type {number}
     * @private
     */
    require('events').EventEmitter.prototype._maxListeners = 25;
    var serverConfig = require('./serverconfiguration');
    var storage = require('./globalstorage').getStorage();
    var  initServer = function(params) {
        var express = require('express'),
            compression = require('compression'),
            server = express(),
            http = require('http'),
            path = require('path'),
            https = require('https'),
            routers = require('./routers/router'),
            logger = require('./logger/logger')(module),
            bodyParser = require('body-parser'),
            Guid = require('guid'),
            cons = require('consolidate'),
            expressValidator = require('express-validator'),
            message = '', guid;
        if(params.statushttp === 'open'){
            message = 'Port: ' + params.viewerPortHttp + ' in use.';
            guid = Guid.create();
            logger.warn(message, {id: guid.value});
            return;
        }
        if(params.statushttps === 'open'){
            message = 'Port: ' + params.viewerPortHttps + ' in use.';
            guid = Guid.create();
            logger.warn(message, {id: guid.value});
            return;
        }

        server.use(compression());
        server.engine('html',cons.underscore);
        server.set('views', path.join(__dirname, '../content/views'));
        server.set('view engine', 'html');

        process.on('uncaughtException', function (err) {
            var guid = Guid.create();
            logger.error(err, err.message, err.stack, {id: guid.value});
        });
        var globalLogErrors = function (err, req, res, next) {
            var guid = Guid.create();
            logger.error('Unhandled exception', err.message, err.stack,  {id: guid.value});
            err.messageId = guid.value;
            next(err);
        };

        var globalErrorHandler = function (err, req, res, next) {
            if(req.method.toUpperCase() === 'GET') {
                res.status(500);
                res.render('500.html', { id: err.messageId, baseUrl: storage.baseUrl }, function callback(err, html) {
                    if(!err){
                        res.send(html);
                    }
                    else{
                        next(err);
                    }
                });
            }
            else{
                res.send(500, 'Internal server error. Id = ' + err.messageId);
            }
        };

        server.set('porthttp', params.viewerPortHttp);
        server.set('porthttps', params.viewerPortHttps);

        server.use(bodyParser.urlencoded({
            extended: true
        }));
        server.use(bodyParser.json());
        server.use(expressValidator([]));
        /**
         * Viewer resources, widget resources and server ping without tokens.
         */
        server.get('/', routers.ping);
        server.get('/heartbeat', routers.heartbeat);
        server.get('/content/*', routers.getViewerResources);
        /**
         * Identity token check
         */
        server.all('/widgets*', routers.authorization);
        server.post('/widgets', routers.upload);
        server.put('/widgets', routers.update);
        /**
         * check for accessory widget to organization
         */
        server.all('/widgets/:widgetId', routers.preconditionCheck);
        server.delete('/widgets/:widgetId', routers.deleteWidget);
        server.get('/widgets/:widgetId', routers.downloadArchive);

        /**
         * Widget token check
         */
        server.all('/organizations/:organizationId/widgets/:widgetId/index.html', routers.authorization);
        server.get('/organizations/:organizationId/widgets/:widgetId/index.html', routers.getWidget);
        server.get('/organizations/:organizationId/widgets/:widgetId/*', routers.getWidgetResources);

        server.get('/*', routers.unhandled);

        server.use(globalLogErrors);
        server.use(globalErrorHandler);

        http.createServer(server).listen(server.get('porthttp'), function () {
            logger.info('Server running at http://' + params.viewerHost + ':' + params.viewerPortHttp);
        });

        if(params.options){
            https.createServer(params.options, server).listen(server.get('porthttps'), function () {
                logger.info('Server running at https://' + params.viewerHost + ':' + params.viewerPortHttps);
            });
        }
    };

    serverConfig.readServerConfig(initServer);
}());


