/**
 * Created by Ruslan_Dulina on 8/8/2014.
 */

(function () {
    'use strict';
    var RestServicesRequester = function () {
        this.fileOperation = new (require('./filesystemprocessor')).FileSystem();
        this.https = require('https');
        this.winston = require('winston');
        this.logger = require('./logger')(module);
        this.secretsPath = __dirname + '/../configuration/secrets.json';
        this.regExpresion = /[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g;
    };

    RestServicesRequester.prototype.getPreferences = function (xmlResult, callback, errorCallback) {
        var that = this, senddata, parsedData, filePath = __dirname + '/../organizations/' +
                xmlResult.organizationId.split(':')[2].replace(that.regExpresion, '_') +
                '/users/' + xmlResult.userId.replace(that.regExpresion, '_'),
            fileName = filePath + '/globalPreferences.json',
            encodedOrg = encodeURIComponent(xmlResult.organizationId),
            rConf = global.viwerConfig.restserviceConfig;
        that.fileOperation.exist(fileName, function (exist) {
            if (exist && !rConf.restServicesUrls.preferencesService.isEnabled) {
                that.fileOperation.readFile(fileName, function (data) {
                    parsedData = JSON.parse(data);
                    xmlResult.lastModifiedPreferences = parsedData.lastModified;
                    xmlResult.organizationPreferences = parsedData.preferences;
                    callback(xmlResult);
                }, errorCallback);
            }
            else {
                var getOptions = {
                    hostname: rConf.restServicesUrls.preferencesService.host,
                    path: rConf.restServicesUrls.preferencesService.path + encodedOrg,
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };
                that.sendRequest(getOptions, senddata, function (response) {
                    that.fileOperation.createPath(filePath, function () {
                        that.fileOperation.writeFile(fileName, JSON.stringify(response), function () {
                            xmlResult.lastModifiedPreferences = response.lastModified;
                            xmlResult.organizationPreferences = response.preferences;
                            callback(xmlResult);
                        }, errorCallback);
                    }, errorCallback);
                }, errorCallback);
            }
        });
    };

    RestServicesRequester.prototype.readConfig = function (filename, callback, errorCallback) {
        var that = this;
        that.fileOperation.readFile(filename, function (data) {
            callback(JSON.parse(data));
        }, errorCallback);
    };

    RestServicesRequester.prototype.sendRequest = function (options, data, callback, errorCallback) {
        var that = this, dataResponse = '', result;
        var request = that.https.request(options, function (res) {
            res.on('data', function (chunk) {
                dataResponse += chunk;
            });

            res.on('end', function () {
                try {
                    result = JSON.parse(dataResponse);
                    callback(result);
                }
                catch (exception) {
                    that.logger.error(exception.message);
                    errorCallback(exception.message);
                }
            });

            res.on('error', function (error) {
                that.logger.error(error.message);
                errorCallback(error.message);
            });
        });
        if (data) {
            request.write(JSON.stringify(data));
        }
        request.end();
        request.on('error', function (error) {
            that.logger.error(error.message);
            errorCallback(error.message);
        });
    };

    RestServicesRequester.prototype.saveSecrets = function (secrets, callback, errorCallback) {
        var result = [], flag = false, that = this;
        that.fileOperation.createFileIfNotExist(that.secretsPath, function () {
            that.fileOperation.readFile(that.secretsPath, function (data) {
                try {
                    data = JSON.parse(data);
                }
                catch (ex) {
                    /**
                     * empty file.
                     */
                }
                if (data.length) {
                    data.forEach(function (element) {
                        if (element.value === secrets.username && element.key === secrets.password) {
                            flag = true;
                        }
                    });
                    if (!flag) {
                        data.push({'key': secrets.password, 'value': secrets.username});
                        that.fileOperation.writeFile(that.secretsPath, JSON.stringify(data), callback, errorCallback);
                    }
                    else {
                        callback();
                    }
                }
                else {
                    result.push({'key': secrets.password, 'value': secrets.username});
                    that.fileOperation.writeFile(that.secretsPath, JSON.stringify(result), callback, errorCallback);
                }
            }, errorCallback);
        });
    };

    RestServicesRequester.prototype.getToken = function (query, xmlResult, callback, errorCallback) {
        var that = this, secretString, message, userId;
        that.readConfig(that.secretsPath, function (secretData) {
            userId = query.userId;
            secretData.forEach(function (secret) {
                if (secret.value === userId) {
                    secretString = secret.key;
                }
            });
            if (secretString) {
                secretString = userId + ':' + secretString;
            } else {
                message = 'Can not find secret for ' + userId + ' organization';
                that.logger.error(message);
                errorCallback(message);
            }

            var postData = {
                'scope': {
                    'dataSources': xmlResult.dataSources
                }
            };

            var postOptions = {
                hostname: global.viwerConfig.restserviceConfig.restServicesUrls.tokenService.host,
                path: global.viwerConfig.restserviceConfig.restServicesUrls.tokenService.path,
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + new Buffer(secretString).toString('base64'),
                    'Content-Type': 'application/json'
                }
            };

            that.sendRequest(postOptions, postData, function (response) {
                xmlResult.token = response.accessToken;
                xmlResult.organizationId = query.organizationId;
                xmlResult.userId = query.userId;
                callback(xmlResult);
            }, errorCallback);

        }, errorCallback);

    };

    module.exports.RestServicesRequester = RestServicesRequester;
}(this));