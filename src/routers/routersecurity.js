/**
 * Created by Ruslan_Dulina on 9/29/2014.
 */

(function () {
    'use strict';
    var crypto = require('crypto');
    var cache = require('./../cache/cache');
    var logger= require('./../logger/logger')(module);
    var Guid = require('guid');
    exports.parseToken = function (token) {
        var parsedToken = null;
        if (token) {
            var parts = token.split('.'),
                tokenHeader = parts[0],
                tokenBody = parts[1],
                tokenSignature = parts[2],
                tokenHeaderObj = JSON.parse(new Buffer(tokenHeader, 'base64').toString()),
                tokenBodyObj = JSON.parse(new Buffer(tokenBody, 'base64').toString()),
                algorithm;
            switch (tokenHeaderObj.alg) {
                case 'SHA1withRSA':
                    algorithm = 'RSA-SHA1';
                    break;
                default :
                    var message = 'Unrecognized algorithm';
                    var guid = Guid.create();
                    logger.error(message , {id: guid.value});
            }
            if(algorithm){
                parsedToken = {
                    tokenHeader: tokenHeader,
                    tokenBody: tokenBody,
                    tokenBodyObj: tokenBodyObj,
                    tokenSignature: tokenSignature,
                    algorithm: algorithm
                };
            }
        }
        return parsedToken;
    };

    exports.isTokenSignatureValid = function(parsedToken){
        var verifier = crypto.createVerify(parsedToken.algorithm);
        verifier.update(parsedToken.tokenHeader + '.' + parsedToken.tokenBody);
        var result = verifier.verify(cache.getCertificate(), parsedToken.tokenSignature, 'base64');
        return result;
    };

    exports.isTokenExpired = function(parsedToken){
        var now = Date.now();
        var result = parseInt(parsedToken.tokenBodyObj.exp, 10) - now < 0;
        return result;
    };

    exports.isTokenRevoked = function(parsedToken){
        var id = parsedToken.tokenBodyObj.jti;
        var result = id === '';
        return result;
    };

    exports.isTokenDomainsContainsParent = function (parsedToken, referer) {
        var domains = parsedToken.tokenBodyObj.aud.domains, i, refererDomain;
        if(parsedToken.tokenBodyObj.sub === 'identity'){
            return true;
        }
        if(referer){
            for(i = 0; i < domains.length; i++){
                refererDomain = referer.substring(0, domains[i].length);
                if(domains[i] === refererDomain){
                    return true;
                }
            }
        }

        return false;
    };

    exports.isTokenHaveValidSub = function(parsedToken, widgetId){
        var sub = parsedToken.tokenBodyObj.sub, result = false;
        if(sub === 'identity'){
            result = true;
        }
        else{
            var ids = sub.split(' ');
            ids.forEach(function(id){
                if(id.slice(7) === widgetId){
                    result = true;
                }
            });
        }

        return result;
    };

    exports.generateSignature = function(data, algorithm){
        var sign = crypto.createSign(algorithm);
        sign.update(data);
        var result = sign.sign('token_private_key', 'base64');

        return result;
    };

    exports.generateCookie = function(clientId, userId){
        var nonce = Math.random();
        var data = clientId + '|' + nonce + '|' + userId;
        var cookieKey = cache.getCookieKey();
        var keyHmac = crypto.createHmac('sha1', cookieKey).update(data).digest('base64');
        var cookie = data + '||' + crypto.createHmac('sha1', keyHmac).update(data).digest('base64');

        return cookie;
    };

    exports.checkCookie = function(cookie){
        var result = false;

        if(cookie){
            var data = cookie.split('||')[0];
            var cookieSignature = cookie.split('||')[1];
            var cookieKey = cache.getCookieKey();
            var keyHmac = crypto.createHmac('sha1', cookieKey).update(data).digest('base64');
            var signature = crypto.createHmac('sha1', keyHmac).update(data).digest('base64');
            result = cookieSignature === signature;
        }

        return result;
    };
}());