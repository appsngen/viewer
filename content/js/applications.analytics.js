(function () {
    'use strict';
    /* jshint ignore:start */
    (function (i, s, o, g, r, a, m) {
        i['GoogleAnalyticsObject'] = r;
        i[r] = i[r] || function () {
            (i[r].q = i[r].q || []).push(arguments);
        }, i[r].l = new Date().valueOf();
        a = s.createElement(o),
            m = s.getElementsByTagName(o)[0];
        a.async = 1;
        a.src = g;
        m.parentNode.insertBefore(a, m);
    })(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');
    /* jshint ignore:end */
    ga('create', 'UA-41473210-1', 'appsngen.com'); // jshint ignore:line

//custom dimension for source. can be "application", "portal" or "dashboard"
    var source = 'application';
    ga('set', 'dimension2', source); // jshint ignore:line

    var queryString = function () {
        // This function is anonymous, is executed immediately and
        // the return value is assigned to QueryString!
        var queryString = {};
        var query = window.location.search.substring(1);
        var vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            // If first entry with this name
            if (typeof queryString[pair[0]] === 'undefined') {
                queryString[pair[0]] = pair[1];
                // If second entry with this name
            } else if (typeof queryString[pair[0]] === 'string') {
                var arr = [ queryString[pair[0]], pair[1] ];
                queryString[pair[0]] = arr;
                // If third or later entry with this name
            } else {
                queryString[pair[0]].push(pair[1]);
            }
        }
        return queryString;
    };

//custom dimension for environment. can be "dev", "qa", "ppe" or "prod"
    var environment = function () {
        var env = 'prod';
        if (window.location.host.indexOf('dev') === 0) {
            env = 'dev';
        } else if (window.location.host.indexOf('qa') === 0) {
            env = 'qa';
        } else if (window.location.host.indexOf('ppe') === 0) {
            env = 'ppe';
        }
        return env;
    };

    ga('set', 'dimension3', environment()); // jshint ignore:line

    var userId = decodeURIComponent(queryString().userId);
    ga('set', 'dimension1', userId); // jshint ignore:line

//custom dimension for applicationId. not necessary when source is not "application"
    var applicationId = decodeURIComponent(queryString().application);
    ga('set', 'dimension4', applicationId); // jshint ignore:line

//custom dimension for parent. not necessary when source is not "application"
    var parent = decodeURIComponent(queryString().parent);
    ga('set', 'dimension5', parent); // jshint ignore:line

//custom dimension for clientId. not necessary when source is not "application"
    var clientId = decodeURIComponent(queryString().clientId);
    ga('set', 'dimension6', clientId); // jshint ignore:line

    ga('send', 'pageview', '/apps/' + applicationId); // jshint ignore:line

}());
