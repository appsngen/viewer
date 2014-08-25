(function (window) {
    'use strict';
    var config;
    var prefs;
    var loadHandlers = [];

    var gadgets = {
        util: {
            hasFeature: function (name) {
                var result = name === 'appstore.api';

                return result;
            },
            unescapeString: function (str) {
                return str;
            },
            runOnLoadHandlers: function () {
                var i;

                for (i = 0; i < loadHandlers.length; i++) {
                    loadHandlers[i]();
                }
            },
            registerOnLoadHandler: function (handler) {
                loadHandlers.push(handler);
            }
        },
        config: {
            init: function (initialConfig) {
                config = initialConfig;
            },
            get: function (featureName) {
                return config[featureName];
            }
        },
        Prefs: function () {
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
                    var type = prefs[prefName].type.toString();

                    return type;
                },
                getPossibleValues: function (prefName) {
                    var possibleValues = prefs[prefName].possibleValues;

                    return possibleValues;
                }
            };
        }
    };

    var shindig = {
        auth: {
            getSecurityToken: function () {
                var token = gadgets.config.get('shindig.auth').authToken;

                return token;
            }
        }
    };

    gadgets.Prefs.setDefaultPrefs_ = function (initialPrefs) {
        prefs = initialPrefs;
    };

    window.shindig = shindig;
    window.gadgets = gadgets;
}(window));