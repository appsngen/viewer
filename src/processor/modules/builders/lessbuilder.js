/**
 * Created by Ruslan_Dulina on 8/11/2014.
 */

(function () {
    'use strict';
    var less = require('less');
    var logger= require('./../../../logger/logger')(module);
    var parser = new (less.Parser)({});
    var Guid = require('guid');

    exports.compileLess = function (data, orgPrefs, callback) {
        var css, organizationStyles = '', property, guid = Guid.create();
        for (property in orgPrefs) {
            if (orgPrefs.hasOwnProperty(property)) {
                if (!orgPrefs[property].toString().match(/'/g)) {
                    organizationStyles = organizationStyles + ('@' + property + ':' + orgPrefs[property] + ';\n');
                }
            }
        }
        data = data.replace('ï»¿', '');
        data = data + organizationStyles;
        try{
            parser.parse(data.toString(), function (error, tree) {
                if (error) {
                    logger.error(error, {id: guid.value});
                    callback(error.message, error, guid.value);
                } else {
                    try{
                        css = tree.toCSS({ compress: true });
                    }
                    catch (exception){
                        logger.error(exception, {id: guid.value});
                        css = exception.message;
                        error = exception;
                    }
                    callback(css, error, guid.value);
                }
            });
        }
        catch (exception){
            logger.error(exception, {id: guid.value});
            css = exception.message;
            callback(css, exception, guid.value);
        }
    };
}());