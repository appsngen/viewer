/**
 * Created by Ruslan_Dulina on 8/11/2014.
 */

(function () {
    'use strict';
    var LessBuilder = function () {
        this.fileOperation = new (require('./filesystemprocessor')).FileSystem();
        this.winston = require('winston');
        this.less = require('less');
        this.logger = require('./logger')(module);
        this.parser = new (this.less.Parser)({});
    };

    LessBuilder.prototype.compileLess = function (files, orgPrefs, callback, errorCallback) {
        var that = this, result = {}, organizationStyles = '', property;
        result.isValid = false;
        for (property in orgPrefs) {
            if (orgPrefs.hasOwnProperty(property)) {
                if (!orgPrefs[property].toString().match(/'/g)) {
                    organizationStyles = organizationStyles + ('@' + property + ':' + orgPrefs[property] + ';\n');
                }
            }
        }
        files.forEach(function (filename, index) {
            that.fileOperation.readFile(filename, function (data) {
                if (data) {
                    data = data + organizationStyles;
                    that.parser.parse(data.toString(), function (error, tree) {
                        if (error) {
                            that.logger.error(error.message, error);
                            errorCallback(error.message);
                        } else {
                            tree.toCSS({ compress: true });
                            result.css = tree.toCSS({
                                compress: true
                            });
                            that.fileOperation.writeFile(filename, result.css, function(){
                                if (index === files.length - 1) {
                                    callback();
                                }
                            }, errorCallback);
                        }
                    });
                }

            }, errorCallback);

        });
    };

    module.exports.LessBuilder = LessBuilder;
}());