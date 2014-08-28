/**
 * Created by Ruslan_Dulina on 7/7/2014.
 */
(function () {
    'use strict';
    var express = require('express'),
        server = express(),
        http = require('http'),
        routers = require('./modules/router'),
        logger = require('./modules/logger')(module),
        port = process.argv[2] || 8889,
        bodyParser = require('body-parser'),
        expressValidator = require('express-validator');

    process.on('uncaughtException', function(err) {
        logger.error(err, err.message, err.stack);
    });

    var globalLogErrors = function(err, req, res, next) {
        logger.error('Unhandled exception', err.message, err.stack);
        next(err);
    };

    var globalErrorHandler = function(err, req, res) {
        res.status(500);
        res.send(500, { error: 'Internal server error.' });
    };

    server.set('port', port);

    server.use(bodyParser.urlencoded({
        extended: true
    }));
    server.use(bodyParser.json());
    server.use(expressValidator([]));

    server.all('*', routers.authorization);
    server.post('/login', routers.login);
    server.post('/widgets', routers.upload);
    server.get('/content/js/*', routers.getViewerResources);
    server.get('/organizations/:organizationId/widgets/:widgetId/index.html', routers.getWidget);
    server.get('/organizations/:organizationId/widgets/:widgetId/*', routers.getWidgetResources);
    server.get('/*', routers.unhandled);
    server.use(globalLogErrors);
    server.use(globalErrorHandler);

    http.createServer(server).listen(server.get('port'), function(){
        console.log('Server running at http://localhost:' + port);
        console.log('CTRL + C to shutdown');
    });
}());


