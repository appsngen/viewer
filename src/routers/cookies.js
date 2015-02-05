/**
 * Created by Ruslan_Dulina on 10/1/2014.
 */

(function () {
    'use strict';
    var http = require('http');
    var logger = require('./../logger/logger')(module);
    var getPattern = function (name) {
        var cache = {};
        if (cache[name]) {
            return cache[name];
        }
        cache[name] = new RegExp('(?:^|;) *' + name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '=([^;]*)');
        return cache[name];
    };

    var pushCookie = function (cookies, cookie) {
        cookies.push(cookie.toHeader());
        return cookies;
    };

    exports.get = function (name, request) {
        var header = request.headers['cookie'];
        if (!header) {
            return;
        }

        var match = header.match(getPattern(name));
        if (!match) {
            return;
        }

        return match[1];
    };

    exports.set = function (response, request, name, value, maxAge) {
        var res = response,
            req = request,
            headers = res.getHeader('Set-Cookie') || [],
            secure = req.protocol === 'https' || req.connection.encrypted,
            cookie = {
                maxAge: maxAge,
                name: name,
                value: value || '',
                path: '/',
                expires: undefined,
                domain: undefined,
                httpOnly: true,
                secure: false,

                toHeader: function () {
                    var header = this.name + '=' + this.value;

                    if (this.maxAge) {
                        this.expires = new Date(Date.now() + this.maxAge);
                    }

                    if (this.path) {
                        header += '; path=' + this.path;
                    }
                    if (this.expires) {
                        header += '; expires=' + this.expires.toUTCString();
                    }
                    if (this.domain) {
                        header += '; domain=' + this.domain;
                    }
                    if (this.secure) {
                        header += '; secure';
                    }
                    if (this.httpOnly) {
                        header += '; httponly';
                    }

                    return header;
                }
            };

        if (typeof headers === 'string') {
            headers = [headers];
        }

        if (!secure) {
            logger.debug('Sending secure cookie over unencrypted connection');
        }

        cookie.secure = secure;
        headers = pushCookie(headers, cookie);
        var setHeader = res.set ? http.OutgoingMessage.prototype.setHeader : res.setHeader;
        setHeader.call(res, 'Set-Cookie', headers);
    };
}());
