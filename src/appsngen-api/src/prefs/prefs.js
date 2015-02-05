/* start of prefs/prefs.js */
/**
 * Provides possibilities to get the set of user preferences those can be redefined with url parameters.
 * @class appstore.prefs
 *
 * depends on: appstore.config, appstore.util
 */
(function (appstore){
    'use strict';
    appstore.util.registerOnLoadHandler(function() {
        //TODO: add prefs converting to real type.
        appstore.prefs = (function () {
            var prefs = {};

            var validatePref = function (value, type, possibleValues) {
                var isValid = false,
                    i, length;

                if (type === 'BOOL') {
                    value = value.toLowerCase();
                    isValid = value === 'true' || value === 'false';
                } else if (type === 'COLOR') {
                    isValid = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
                } else if (type === 'ENUM' || type === 'FONT_WEIGHT' ||
                    type === 'FONT_STYLE' || type === 'TEXT_DECORATION') {
                    for (i = 0, length = possibleValues.length; i < length; i++) {
                        if (possibleValues[i]) {
                            isValid = true;
                            break;
                        }
                    }
                } else if (type === 'INTEGER') {
                    isValid = /^\-?[0-9]+$/.test(value);
                } else if (type === 'FLOAT') {
                    isValid = /^(\-?([0-9]+|[0-9]+\.[0-9]+))$/.test(value);
                } else {
                    isValid = true;
                }

                return isValid;
            };

            var getDefaultPrefs = function () {
                var result = {}, i,
                    gadgetsPrefs = appstore.config.prefs,
                    prefsNames = gadgetsPrefs.getPrefsNames();

                for (i = 0; i < prefsNames.length; i++) {
                    result[prefsNames[i]] = gadgetsPrefs.getString(prefsNames[i]);
                }

                return result;
            };

            var extendWithParamsPrefs = function (defaultPrefs) {
                var gadgetsPrefs = appstore.config.prefs,
                    prefsNames = gadgetsPrefs.getPrefsNames(),
                    paramPref, i;

                for (i = 0; i < prefsNames.length; i++) {
                    paramPref = appstore.util.getURLParameter('X_' + prefsNames[i]);
                    if (paramPref !== null) {
                        defaultPrefs[prefsNames[i]] = paramPref;
                    }
                    // Get rid of this after adding prefs parsing
                    if (gadgetsPrefs.getType(prefsNames[i]) === 'BOOL') {
                        defaultPrefs[prefsNames[i]] = defaultPrefs[prefsNames[i]].toLowerCase();
                    }
                }
            };

            prefs = getDefaultPrefs();
            extendWithParamsPrefs(prefs);

            return {
                /**
                 * Gets all user preferences.
                 * @method get
                 * @return {object} hash set with all user preferences.
                 */
                get: function () {
                    return prefs;
                },

                /**
                 * Validates all user preferences.
                 * @method validate
                 * @return {object} object with validation status and error message is necessary.
                 */
                validate: function () {
                    var invalidFields = [], isValid, gadgetsPrefs = appstore.config.prefs, name;

                    for (name in prefs) {
                        if (prefs.hasOwnProperty(name)) {
                            isValid = validatePref(prefs[name], gadgetsPrefs.getType(name),
                                gadgetsPrefs.getPossibleValues(name));
                            if (!isValid) {
                                invalidFields.push(name);
                            }
                        }
                    }

                    if (invalidFields.length > 0) {
                        return { isValid: false, message: 'The following preferences: "' + invalidFields.join(', ') +
                            '" have invalid values. Please check them and try again.' };
                    }

                    return { isValid: true };
                }
            };
        } ());
    });
}(appstore));