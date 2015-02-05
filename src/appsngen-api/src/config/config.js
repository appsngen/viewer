(function (appstore) {
    'use strict';
    var prefs, widgetConfig, supportedBrowsers;

    appstore.config = {
        init: function(initialConfig, initialPrefs, initialSupportedBrowsers){
            widgetConfig = initialConfig;
            prefs = initialPrefs;
            supportedBrowsers = initialSupportedBrowsers;
        }
    };

    var Prefs = function () {
        return {
            getPrefsNames: function () {
                var name, names = [];

                for (name in prefs) {
                    if (prefs.hasOwnProperty(name)) {
                        names.push(name);
                    }
                }

                return names;
            },
            getString: function (prefName) {
                var value = '';
                if(prefs[prefName]){
                    value = prefs[prefName].value.toString();
                }

                return value;
            },
            getType: function (prefName) {
                var type = '';
                if(prefs[prefName]){
                    type = prefs[prefName].type.toString();
                }

                return type;
            },
            getPossibleValues: function (prefName) {
                var possibleValues = [];
                if (prefs[prefName]) {
                    possibleValues = prefs[prefName].possibleValues;
                }

                return possibleValues;
            }
        };
    };

    appstore.util.registerOnLoadHandler(function () {
        appstore.config.dataSourceProxyUrl = widgetConfig['appstore.api'].datasourceProxyUrl;
        appstore.config.datasourceActivProxyUrl = widgetConfig['appstore.api'].activProxyWebSocketUrl;
        appstore.config.dataSourceProxyToken = widgetConfig.authToken;
        appstore.config.unsupportedBrowserUrl = widgetConfig['appstore.api'].unsupportedBrowserUrl;
        appstore.config.metadata = widgetConfig['core.util']['appstore.events'];
        appstore.config.prefs = new Prefs();
        appstore.config.supportedBrowsers = supportedBrowsers;
    });
}(appstore));
