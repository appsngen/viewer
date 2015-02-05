/*
 * depends on: appstore.util, appstore.config
 * */
(function () {
    'use strict';

    appstore.util.registerOnLoadHandler(function () {
        appstore.dataSourceProxy = {
            getUrl: function (request) {
                var token = appstore.config.dataSourceProxyToken;
                if(!request.params){
                    request.params = {};
                }

                request.params.accessToken = token;
                var uri = appstore.util.createRequestUri(request);
                var endPoint = appstore.config.dataSourceProxyUrl;
                var requestUri = endPoint + '/data-sources/' + uri;

                return requestUri;
            }
        };
    });
}());