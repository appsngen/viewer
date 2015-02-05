/**
 * Created by Ruslan_Dulina on 8/7/2014.
 */

(function () {
    'use strict';
    var storage = require('./../../globalstorage').getStorage();
    var logger = require('./../../logger/logger')(module);
    var cache = require('./../../cache/cache');
    var publisher = require('./../../rabbitmq/viewerpublisher');
    var repository = require('./../../dataproviders/databaseprovider');
    var NodeZip = require('node-zip');
    var Guid = require('guid');
    if(storage.dataProvider === 'filesystem'){
        repository = require('./../../dataproviders/filesystemprovider');
    }
    exports.createObjFromZipFile = function (data, callback, errorCallback) {
        var zip;
        try{
            zip = new NodeZip(data, {base64: false, checkCRC32: true});
            callback(zip);
        }
        catch (ex){
            var guid = Guid.create();
            logger.error(ex, {id: guid.value});
            errorCallback(ex, guid.value);
        }
    };

    exports.setFileContentAndOptions = function (originFile, file, zip, errorCallback) {
        try {
            if (originFile.files[file]._originData) {
                zip.file(file, originFile.files[file]._originData);
            }
            else {
                zip.file(file, originFile.files[file]._data);
            }
            zip.files[file].options.base64 = originFile.files[file].options.base64;
            zip.files[file].options.compression = originFile.files[file].options.compression;
            zip.files[file].options.binary = originFile.files[file].options.binary;
            zip.files[file].options.dir = originFile.files[file].options.dir;
            zip.files[file].options.optimizedBinaryString = originFile.files[file].options.optimizedBinaryString;

            return zip;
        }
        catch (ex) {
            var guid = Guid.create();
            logger.error('Can\'t create zip archive from origin source.', ex, {id: guid.value});
            errorCallback(ex, guid.value);
        }

    };

    exports.getOriginArchive = function(widgetId, callback, errorCallback, notFoundCallback) {
        var originFile = cache.getOriginZip(widgetId);
        if (originFile) {
            var zip = new NodeZip();
            for (var file in originFile.files) {
                if (originFile.files.hasOwnProperty(file)) {
                    this.setFileContentAndOptions(originFile, file, zip, errorCallback);
                }
            }
            zip.root = originFile.root;

            var data = zip.generate({base64: false, compression: 'DEFLATE'});
            data = new Buffer(data, 'binary');
            callback(data);
        }
        else {
            notFoundCallback('Widget: ' + widgetId + ' not found');
        }
    };

    exports.saveZip = function (config, callback) {
        config.zip.xml = config.xml;
        config.globalPreferences.organizationId = config.query.organizationId;
        var params = {
            dataZip: JSON.stringify(config.zip),
            dataOriginZip: JSON.stringify(config.originZip),
            config: config
        };

        callback(params, this.saveZipTransaction.bind(this));
    };

    exports.saveZipTransaction = function (params, callback, errorCallback) {
        repository.saveWidget(params.dataZip, params.dataOriginZip, params.config.xml, function(){
            var publishParams = {
                widgetId: params.config.xml.widgetId,
                id : storage.id,
                globalPreferences : params.config.globalPreferences,
                type: 'widgetUpdated',
                organizationId: params.config.query.organizationId
            };
            if(storage.rabbitMqConfiguration.amqpChannel){
                publisher.publish(publishParams, storage.rabbitMqConfiguration.amqpChannel);
            }
            else{
                logger.warn('Can\'t inform all instances of viewer about widget saving');
            }
            cache.updateOriginCache(params.config.zip, params.config.xml.widgetId);
            cache.removeFromCompiledCache(params.config.xml.widgetId);
            cache.updatePreferenceCache(params.config.globalPreferences, params.config.query.organizationId);
            cache.deleteWidgetPreferenceCache(params.config.query.organizationId, params.config.xml.id);
            callback(params.config.xml.widgetId);

        }, errorCallback);
    };
}());
