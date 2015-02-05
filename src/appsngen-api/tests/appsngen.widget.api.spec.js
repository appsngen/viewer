describe('The appstore.api.application suite', function () {
    'use strict';

    var onLoadHandlers = {
        config: 0,
        dataSourceProxy: 1,
        ajax: 2,
        socket: 3,
        prefs: 4,
        symbology: 5,
        metadata: 6,
        adjustHeight: 7,
        resource: 8,
        browserDetect: 9,
        resize: 10,
        ready: 11
    };

    var postMessageHandlers = {
        events: 0,
        adjustHeightCommon: 1,
        securityCommon: 2
    };

    describe('Ajax feature', function () {
        var request;
        var originalConfig = appstore.config;
        var dummyConfig = {
            dataSourceProxyUrl: 'proxyUrl',
            dataSourceProxyToken: 'proxyToken'
        };

        beforeEach(function () {
            request = {
                dataSourceId: 'vendor.source'
            };

            appstore.config = dummyConfig;

            spyOn(appstore.util, 'getTokenData').and.callFake(function () {
                return {
                    aud: {
                        user: 'user',
                        organization: 'organization'
                    }
                };
            });

            appstore.util.onLoadHandlers[onLoadHandlers.ajax]();
        });

        afterEach(function () {
            appstore.config = originalConfig;
        });

        describe('should make valid request', function () {
            beforeEach(function () {
                spyOn(XMLHttpRequest.prototype, 'open');
                spyOn(XMLHttpRequest.prototype, 'setRequestHeader');
                spyOn(XMLHttpRequest.prototype, 'send');
            });

            it('to a specfied mashup without any parameters', function () {
                var expectedUri = dummyConfig.dataSourceProxyUrl + '/data-sources/' + request.dataSourceId;

                appstore.ajax(request);

                expect(XMLHttpRequest.prototype.open).toHaveBeenCalledWith('GET', expectedUri, true);
                expect(XMLHttpRequest.prototype.send).toHaveBeenCalledWith(undefined);
                expect(XMLHttpRequest.prototype.setRequestHeader.calls.allArgs()).toEqual([
                    ['Authorization', 'Bearer proxyToken'],
                    ['DS-Viewer', 'user'],
                    ['DS-Owner', 'organization']
                ]);
            });

            it('to a specfied mashup with path and params', function () {
                var path = 'testPath';
                var expectedURI = dummyConfig.dataSourceProxyUrl + '/data-sources/' + request.dataSourceId +
                    '/' + path + '?param1=1&param2=true&param3=3.4%7Cvalue';

                request.path = path;
                request.params = {
                    param1: 1,
                    param2: true,
                    param3: [3.4, 'value']
                };

                appstore.ajax(request);

                expect(XMLHttpRequest.prototype.open).toHaveBeenCalledWith('GET', expectedURI, true);
                expect(XMLHttpRequest.prototype.send).toHaveBeenCalledWith(undefined);
                expect(XMLHttpRequest.prototype.setRequestHeader.calls.allArgs()).toEqual([
                    ['Authorization', 'Bearer proxyToken'],
                    ['DS-Viewer', 'user'],
                    ['DS-Owner', 'organization']
                ]);
            });

            it('to a specfied mashup with a specfied method, body and headers', function () {
                var expectedUri = dummyConfig.dataSourceProxyUrl + '/data-sources/' + request.dataSourceId;

                request.headers = { 'key': 'value' };
                request.body = 'body';
                request.method = 'POST';

                appstore.ajax(request);

                expect(XMLHttpRequest.prototype.open).toHaveBeenCalledWith('POST', expectedUri, true);
                expect(XMLHttpRequest.prototype.send).toHaveBeenCalledWith('body');
                expect(XMLHttpRequest.prototype.setRequestHeader.calls.allArgs()).toEqual([
                    ['key', 'value'],
                    ['Authorization', 'Bearer proxyToken'],
                    ['DS-Viewer', 'user'],
                    ['DS-Owner', 'organization']
                ]);
            });

        });

        describe('should handle', function () {
            var expectedXhrHandler,
                expectedXhrEvent;

            beforeEach(function () {
                spyOn(XMLHttpRequest.prototype, 'addEventListener').and.callFake(function (eventName, handler) {
                    expectedXhrHandler = handler;
                });

                spyOn(XMLHttpRequest.prototype, 'send').and.callFake(function () {
                    setTimeout(function () {
                        expectedXhrHandler(expectedXhrEvent);
                    }, 0);
                });
                expectedXhrEvent = {
                    target: {
                        response: '{ "testProp" : "testValue"}',
                        status: 200
                    }
                };

                jasmine.clock().install();
            });

            afterEach(function () {
                jasmine.clock().uninstall();
            });

            it('success received responses', function () {
                appstore.ajax(request).success(function (response, code) {
                    expect(response).toEqual({ testProp: 'testValue' });
                    expect(code).toBe(200);
                });

                jasmine.clock().tick(1);
            });

            it('error received responses', function () {
                expectedXhrEvent.target.status = 400;

                appstore.ajax(request).error(function (response, code) {
                    expect(response).toEqual({ testProp: 'testValue' });
                    expect(code).toBe(400);
                });

                jasmine.clock().tick(1);
            });

            it('error received invalid_token responses', function () {
                expectedXhrEvent.target.status = 401;
                expectedXhrEvent.target.response = null;

                spyOn(XMLHttpRequest.prototype, 'getResponseHeader').and.callFake(function () {
                    var header = 'Bearer realm="appsngen", error="invalid_token",' +
                        'error_description="Token cannot be parsed."';
                    return header;
                });

                appstore.ajax(request).error(function (response, code) {
                    expect(response).toEqual({ error: 'invalid_token', errorMessage: 'Token cannot be parsed.' });
                    expect(code).toBe(401);
                });

                jasmine.clock().tick(1);
            });

            it('error received invalid responses', function () {
                expectedXhrEvent.target.status = 401;
                expectedXhrEvent.target.response = '{ "testProp" : "testValue"';

                appstore.ajax(request).error(function (response, code) {
                    expect(response).toEqual({error: 'response_parser_error', errorMessage: 'Unable to parse json.'});
                    expect(code).toBe(401);
                });

                jasmine.clock().tick(1);
            });

            it('error received unknown responses', function () {
                expectedXhrEvent.target.status = 401;
                expectedXhrEvent.target.response = null;

                spyOn(XMLHttpRequest.prototype, 'getResponseHeader').and.callFake(function () {
                    return '';
                });

                appstore.ajax(request).error(function (response, code) {
                    expect(response).toEqual({
                        error: 'response_parser_error',
                        errorMessage: 'Unknown response parse error.'
                    });
                    expect(code).toBe(401);
                });

                jasmine.clock().tick(1);
            });

            it('received responses with chain hanlers', function () {
                appstore.ajax(request).success(function (response, code) {
                    expect(response).toEqual({ testProp: 'testValue' });
                    expect(code).toBe(200);
                }).success(function (response, code) {
                        expect(response).toEqual({ testProp: 'testValue' });
                        expect(code).toBe(200);
                    });
                jasmine.clock().tick(1);
            });

            it('received responses with a custom success/error predicate', function () {
                var isSuccessHandled = false,
                    isErrorHandled = false;

                expectedXhrEvent.target.status = 201;
                appstore.ajax(request).success(function () {
                    isSuccessHandled = true;
                }).error(function () {
                        isErrorHandled = true;
                    }).isSuccessful = function (response, statusCode) {
                    return statusCode === 201;
                };

                jasmine.clock().tick(1);

                expect(isSuccessHandled).toBe(true);
                expect(isErrorHandled).toBe(false);
            });

            it('received responses with a custom response parser', function () {
                appstore.ajax(request).success(function (response) {
                    expect(response).toEqual({ testProp: 'testValue', additionalProp: 'additionalValue' });
                }).parseResponse = function (response) {
                    var result = JSON.parse(response);
                    result.additionalProp = 'additionalValue';

                    return result;
                };

                jasmine.clock().tick(1);
            });
        });

    });

    describe('Browser support feature', function () {
        // TODO: test feature
    });

    describe('Config feature', function () {
        it('should store config and read it', function () {
            appstore.config.init({
                'appstore.api': {
                    'datasourceProxyUrl': 'proxyUrl',
                    'activProxyWebSocketUrl': 'activProxyUrl',
                    'unsupportedBrowserUrl': 'unsupportedBrowserUrl'
                },
                'authToken':'token',
                'core.util': {
                    'appstore.events': {
                        'key': 'value'
                    }
                }
            }, {
                fundInstrument1: {
                    value: 40108071,
                    type: 'STRING',
                    possibleValues:[40108072, 40108073]
                },
                fundInstrument2: {
                    value: 40108074,
                    type: 'INTEGER',
                    possibleValues:[40108075, 40108076]
                }
            }, [
                'Chrome',
                'Safari'
            ]);

            appstore.util.onLoadHandlers[onLoadHandlers.config]();

            expect(appstore.config.dataSourceProxyUrl).toEqual('proxyUrl');
            expect(appstore.config.datasourceActivProxyUrl).toEqual('activProxyUrl');
            expect(appstore.config.dataSourceProxyToken).toEqual('token');
            expect(appstore.config.unsupportedBrowserUrl).toEqual('unsupportedBrowserUrl');
            expect(appstore.config.metadata).toEqual({
                'key': 'value'
            });
            expect(appstore.config.supportedBrowsers).toEqual(['Chrome', 'Safari']);

            expect(appstore.config.prefs.getPrefsNames()).toEqual(['fundInstrument1', 'fundInstrument2']);
            expect(appstore.config.prefs.getString()).toEqual('');
            expect(appstore.config.prefs.getType()).toEqual('');
            expect(appstore.config.prefs.getPossibleValues()).toEqual([]);
            expect(appstore.config.prefs.getString('fundInstrument1')).toEqual('40108071');
            expect(appstore.config.prefs.getType('fundInstrument1')).toEqual('STRING');
            expect(appstore.config.prefs.getPossibleValues('fundInstrument1')).toEqual([40108072, 40108073]);
            expect(appstore.config.prefs.getString('fundInstrument2')).toEqual('40108074');
            expect(appstore.config.prefs.getType('fundInstrument2')).toEqual('INTEGER');
            expect(appstore.config.prefs.getPossibleValues('fundInstrument2')).toEqual([40108075, 40108076]);
        });
    });

    describe('Data source proxy feature', function () {
        var originalConfig = appstore.config;
        var dummyConfig = {
            dataSourceProxyUrl: 'proxyUrl',
            dataSourceProxyToken: 'proxyToken'
        };

        beforeEach(function () {
            appstore.config = dummyConfig;
            appstore.util.onLoadHandlers[onLoadHandlers.dataSourceProxy]();
        });

        afterEach(function () {
            appstore.config = originalConfig;
        });

        it('should create valid data source proxy uri', function () {
            var request = {
                dataSourceId: 'vendor.source',
                path: '/path',
                params: {
                    1: 1,
                    2: 'two?'
                }
            };

            var url = appstore.dataSourceProxy.getUrl(request);

            expect(url).toEqual('proxyUrl/data-sources/vendor.source/path?1=1&2=two%3F&accessToken=proxyToken');
        });
    });

    describe('Dynamic height application feature', function () {
        var expectedParentUrl = 'parent';
        var expectedFrameId = 'testFrameId';
        var messageListener;

        beforeEach(function () {
            spyOn(appstore.util, 'postMessage').and.callFake(function () {
            });
            spyOn(appstore.util, 'receiveMessage').and.callFake(function (callback) {
                messageListener = callback;
            });
            spyOn(appstore.util, 'getURLParameter').and.callFake(function (param) {
                switch (param) {
                    case 'frameId':
                        return expectedFrameId;
                    case 'parent':
                        return expectedParentUrl;
                    default:
                        return null;
                }
            });

            appstore.util.onLoadHandlers[onLoadHandlers.adjustHeight]();

            jasmine.clock().install();
        });

        afterEach(function () {
            jasmine.clock().uninstall();
        });

        it('should send adjusting height message to parent', function () {
            var message, args;

            appstore.adjustHeight();
            jasmine.clock().tick(100);

            args = appstore.util.postMessage.calls.mostRecent().args;
            message = JSON.parse(args[0]);
            expect(appstore.util.postMessage).toHaveBeenCalled();
            expect(message.type).toEqual('adjustHeightCall');
            expect(message.frameId).toEqual(expectedFrameId);
            expect(message.data.height).toEqual(document.documentElement.offsetHeight);
            expect(message.data.isFirst).toEqual(true);

            expect(args[1]).toEqual(expectedParentUrl);
            expect(args[2]).toEqual(window.parent);

            expect(appstore.util.getURLParameter.calls.allArgs()).toEqual([
                ['frameId'],
                ['parent']
            ]);
        });

        it('should send adjusting height message to parent with specified height', function () {
            var message, args, expectedHeight = 199;

            appstore.adjustHeight(expectedHeight);
            jasmine.clock().tick(100);

            args = appstore.util.postMessage.calls.mostRecent().args;
            message = JSON.parse(args[0]);
            expect(appstore.util.postMessage).toHaveBeenCalled();
            expect(message.type).toEqual('adjustHeightCall');
            expect(message.frameId).toEqual(expectedFrameId);
            expect(message.data.height).toEqual(expectedHeight);
            expect(message.data.isFirst).toEqual(false);

            expect(args[1]).toEqual(expectedParentUrl);
            expect(args[2]).toEqual(window.parent);

            expect(appstore.util.getURLParameter.calls.allArgs()).toEqual([
                ['frameId'],
                ['parent']
            ]);
        });

        it('should call complete handler after adjust height reply message', function () {
            var handlerCalled = false;
            var handler = function () {
                handlerCalled = true;
            };

            var message = {
                type: 'adjustHeightReply',
                data: {
                    height: 42,
                    isFirst: true
                }
            };
            var messageString = JSON.stringify(message);

            appstore.adjustHeight().complete(handler);
            jasmine.clock().tick(100);

            messageListener({
                data: messageString
            });
            expect(handlerCalled).toEqual(true);
        });
    });

    describe('Dynamic height common feature', function () {
        var dummyFrame = {
            style: {},
            src: 'childSrc',
            contentWindow: {}
        };

        beforeEach(function () {
            spyOn(appstore.util, 'postMessage').and.callFake(function () {
            });
            spyOn(document, 'getElementById').and.callFake(function () {
                return dummyFrame;
            });
        });

        it('should adjusting height of calling frame if feature enabled', function () {
            var message, messageString, messageHandler, replyMessage, replyMessageString;

            message = {
                type: 'adjustHeightCall',
                frameId: 'frameId',
                data: {
                    height: 42,
                    isFirst: true
                }
            };
            messageString = JSON.stringify(message);
            messageHandler = window.postMessageListeners[postMessageHandlers.adjustHeightCommon];

            replyMessage = {
                type: 'adjustHeightReply',
                data: message.data
            };
            replyMessageString = JSON.stringify(replyMessage);

            appstore.dynamicHeight.enable();

            messageHandler({
                data: messageString
            });

            expect(document.getElementById).toHaveBeenCalledWith(message.frameId);
            expect(appstore.util.postMessage)
                .toHaveBeenCalledWith(replyMessageString, dummyFrame.src, dummyFrame.contentWindow);

            expect(dummyFrame.style.height).toEqual(message.data.height + 'px');
        });

        it('should not adjusting height of calling frame if feature disabled', function () {
            var message, messageString, messageHandler;

            message = {
                type: 'adjustHeightCall',
                frameId: 'frameId',
                data: {
                    height: 128,
                    isFirst: true
                }
            };
            messageString = JSON.stringify(message);
            messageHandler = window.postMessageListeners[postMessageHandlers.adjustHeightCommon];

            appstore.dynamicHeight.disable();

            messageHandler({
                data: messageString
            });

            expect(document.getElementById).not.toHaveBeenCalled();
            expect(appstore.util.postMessage).not.toHaveBeenCalled();
        });
    });

    describe('Events feature', function () {
        var frameId = '.';
        var originalParent = window.parent;
        var dummyParent = {
            name: '..',
            src: 'parentSrc',
            contentWindow: {}
        };
        var dummyChild = {
            src: 'childSrc',
            name: 'child',
            contentWindow: {}
        };
        var dummyChild2 = {
            src: 'childSrc2',
            name: 'child2',
            contentWindow: {}
        };
        var channel = 'TEST_CHANNEL';
        var publishMessageFromParent = {
            type:'publish',
            sender:dummyParent.name,
            data: {
                channel: channel,
                data: {
                    key: 'value'
                }
            }
        };
        var publishMessageFromParentString = JSON.stringify(publishMessageFromParent);
        var channel2 = 'TEST_CHANNEL2';
        var publishMessageFromParent2 = {
            type:'publish',
            sender:dummyParent.name,
            data: {
                channel: channel2,
                data: {
                    key: 'value'
                }
            }
        };
        var publishMessageFromParent2String = JSON.stringify(publishMessageFromParent2);
        var publishMessageFromCurrent = JSON.parse(publishMessageFromParentString);
        publishMessageFromCurrent.sender = frameId;
        var publishMessageFromCurrentString = JSON.stringify(publishMessageFromCurrent);
        var publishMessageFromChild2 = JSON.parse(publishMessageFromParentString);
        publishMessageFromChild2.sender = dummyChild2.name;
        var publishMessageFromChild2String = JSON.stringify(publishMessageFromChild2);
        var subscribeMessageFromChild = {
            type:'subscribe',
            sender:'child',
            data: {
                channel:channel
            }
        };
        var subscribeMessageFromChildString = JSON.stringify(subscribeMessageFromChild);
        var subscribeMessageToParent = JSON.parse(subscribeMessageFromChildString);
        subscribeMessageToParent.sender = frameId;
        var subscribeMessageToParentString = JSON.stringify(subscribeMessageToParent);
        var unsubscribeMessageFromChild = {
            type:'unsubscribe',
            sender:'child',
            data: {
                channel:channel
            }
        };
        var unsubscribeMessageFromChildString = JSON.stringify(unsubscribeMessageFromChild);
        var unsubscribeMessageToParent = JSON.parse(unsubscribeMessageFromChildString);
        unsubscribeMessageToParent.sender = frameId;
        var unsubscribeMessageToParentString = JSON.stringify(unsubscribeMessageToParent);

        beforeEach(function () {
            window.parent = dummyParent;

            spyOn(appstore.util, 'getURLParameter').and.callFake(function (param) {
                switch (param) {
                    case 'frameId':
                        return frameId;
                    case 'parent':
                        return dummyParent.src;
                    default:
                        return null;
                }
            });
            spyOn(appstore.util, 'postMessage').and.callFake(function () {});
            spyOn(console, 'log').and.callFake(function () {});
            spyOn(document, 'getElementById').and.callFake(function () {
                return dummyChild;
            });

            jasmine.clock().install();
        });

        afterEach(function () {
            window.parent = originalParent;

            jasmine.clock().uninstall();
        });

        it('should subscribe current level handler and call it when receives event from top', function () {
            var postMessageHandler = window.postMessageListeners[postMessageHandlers.events];
            var subscriberCalled = false;
            var receivedData;
            var receivedChannel;

            appstore.events.subscribe(channel, function (channel, data) {
                subscriberCalled = true;
                receivedData = data;
                receivedChannel = channel;
            });

            postMessageHandler({
                data: publishMessageFromParentString,
                source: dummyParent
            });

            expect(subscriberCalled).toEqual(true);
            expect(receivedChannel).toEqual(publishMessageFromParent.data.channel);
            expect(receivedData).toEqual(publishMessageFromParent.data.data);
        });

        it('should subscribe current level handler and call it when receives event from child', function () {
            var postMessageHandler = window.postMessageListeners[postMessageHandlers.events];
            var subscriberCalled = false;
            var receivedData;
            var receivedChannel;

            appstore.events.subscribe(channel, function (channel, data) {
                subscriberCalled = true;
                receivedData = data;
                receivedChannel = channel;
            });

            postMessageHandler({
                data: publishMessageFromChild2String,
                source: dummyChild2
            });

            expect(subscriberCalled).toEqual(true);
            expect(receivedChannel).toEqual(publishMessageFromParent.data.channel);
            expect(receivedData).toEqual(publishMessageFromParent.data.data);
        });

        it('should not call current level subscriber when receives event from top with wrong channel', function () {
            var postMessageHandler = window.postMessageListeners[postMessageHandlers.events];
            var subscriberCalled = false;

            appstore.events.subscribe(channel, function () {
                subscriberCalled = true;
            });

            postMessageHandler({
                data: publishMessageFromParent2,
                source: dummyParent
            });

            expect(subscriberCalled).toEqual(false);
        });

        it('should unsubscribe current level subscriber and not call it when receives event from top', function () {
            var postMessageHandler = window.postMessageListeners[postMessageHandlers.events];
            var subscriberCalled = false;

            appstore.events.subscribe(channel, function () {
                subscriberCalled = true;
            });
            appstore.events.unsubscribe(channel);

            postMessageHandler({
                data: publishMessageFromParentString,
                source: dummyParent
            });

            expect(subscriberCalled).toEqual(false);
        });

        it('should subscribe underlying window and send event to it when receives event from top', function () {
            var postMessageHandler = window.postMessageListeners[postMessageHandlers.events];

            postMessageHandler({
                data: subscribeMessageFromChildString,
                source: dummyChild
            });

            postMessageHandler({
                data: publishMessageFromParentString,
                source: dummyParent
            });

            expect(document.getElementById).toHaveBeenCalledWith(dummyChild.name);
            expect(appstore.util.postMessage.calls.allArgs()).toEqual([
                [subscribeMessageToParentString, dummyParent.src, dummyParent],
                [publishMessageFromCurrentString, dummyChild.src, dummyChild.contentWindow]
            ]);
        });

        it('should subscribe underlying window and send event to it when receives event from current lvl', function () {
            var postMessageHandler = window.postMessageListeners[postMessageHandlers.events];

            postMessageHandler({
                data: subscribeMessageFromChildString,
                source: dummyChild
            });

            appstore.events.publish(publishMessageFromCurrent.data.channel, publishMessageFromCurrent.data.data);
            jasmine.clock().tick(1);

            expect(document.getElementById).toHaveBeenCalledWith(dummyChild.name);
            expect(appstore.util.postMessage.calls.allArgs()).toEqual([
                [subscribeMessageToParentString, dummyParent.src, dummyParent],
                [publishMessageFromCurrentString, dummyChild.src, dummyChild.contentWindow],
                [publishMessageFromCurrentString, dummyParent.src, dummyParent]
            ]);
        });

        it('should subscribe underlying window and send event to it when receives event from child2', function () {
            var postMessageHandler = window.postMessageListeners[postMessageHandlers.events];

            postMessageHandler({
                data: subscribeMessageFromChildString,
                source: dummyChild
            });

            postMessageHandler({
                data: publishMessageFromChild2String,
                source: dummyChild2
            });

            expect(document.getElementById).toHaveBeenCalledWith(dummyChild.name);
            expect(appstore.util.postMessage.calls.allArgs()).toEqual([
                [subscribeMessageToParentString, dummyParent.src, dummyParent],
                [publishMessageFromCurrentString, dummyChild.src, dummyChild.contentWindow],
                [publishMessageFromCurrentString, dummyParent.src, dummyParent]
            ]);
        });

        it('should unsubscribe underlying window and not send event to it when receives event from top', function () {
            var postMessageHandler = window.postMessageListeners[postMessageHandlers.events];

            postMessageHandler({
                data: subscribeMessageFromChildString,
                source: dummyChild
            });

            postMessageHandler({
                data: unsubscribeMessageFromChildString,
                source: dummyChild
            });

            postMessageHandler({
                data: publishMessageFromParentString,
                source: window.parent
            });

            expect(appstore.util.postMessage.calls.allArgs()).toEqual([
                [subscribeMessageToParentString, dummyParent.src, dummyParent],
                [unsubscribeMessageToParentString, dummyParent.src, dummyParent]
            ]);
        });

        it('should unsubscribe underlying window and not send event to it when receives event from curr.', function () {
            var postMessageHandler = window.postMessageListeners[postMessageHandlers.events];

            postMessageHandler({
                data: subscribeMessageFromChildString,
                source: dummyChild
            });

            postMessageHandler({
                data: unsubscribeMessageFromChildString,
                source: dummyChild
            });

            appstore.events.publish(publishMessageFromCurrent.data.channel, publishMessageFromCurrent.data.data);
            jasmine.clock().tick(1);

            expect(appstore.util.postMessage.calls.allArgs()).toEqual([
                [subscribeMessageToParentString, dummyParent.src, dummyParent],
                [unsubscribeMessageToParentString, dummyParent.src, dummyParent],
                [publishMessageFromCurrentString, dummyParent.src, dummyParent]
            ]);
        });

        it('should unsubscribe underlying window and not send event to it when receives event from chld2', function () {
            var postMessageHandler = window.postMessageListeners[postMessageHandlers.events];

            postMessageHandler({
                data: subscribeMessageFromChildString,
                source: dummyChild
            });

            postMessageHandler({
                data: unsubscribeMessageFromChildString,
                source: dummyChild
            });

            postMessageHandler({
                data: publishMessageFromChild2String,
                source: dummyChild2
            });

            expect(appstore.util.postMessage.calls.allArgs()).toEqual([
                [subscribeMessageToParentString, dummyParent.src, dummyParent],
                [unsubscribeMessageToParentString, dummyParent.src, dummyParent],
                [publishMessageFromCurrentString, dummyParent.src, dummyParent]
            ]);
        });

        it('should send publish event for a specified channel to parent', function () {
            appstore.events.publish(publishMessageFromCurrent.data.channel, publishMessageFromCurrent.data.data);
            jasmine.clock().tick(1);

            expect(appstore.util.postMessage.calls.allArgs()).toEqual([
                [publishMessageFromCurrentString, dummyParent.src, dummyParent]
            ]);
        });

        it('should send subscribe event for a specified channel to parent', function () {
            appstore.events.subscribe(channel, function () {
            });

            expect(appstore.util.postMessage).toHaveBeenCalledWith(subscribeMessageToParentString,
                dummyParent.src, dummyParent);
        });

        it('should send unsubscribe event for a specified channel to parent', function () {
            appstore.events.unsubscribe(channel);

            expect(appstore.util.postMessage).toHaveBeenCalledWith(unsubscribeMessageToParentString,
                dummyParent.src, dummyParent);
        });

        it('should support debug mode', function () {
            var postMessageHandler = window.postMessageListeners[postMessageHandlers.events];
            appstore.events.debug = true;

            appstore.events.subscribe(channel);
            postMessageHandler({
                data: subscribeMessageFromChildString,
                source: dummyChild
            });

            appstore.events.publish(channel, publishMessageFromCurrent.data);
            postMessageHandler({
                data: publishMessageFromParentString,
                source: dummyParent
            });
            postMessageHandler({
                data: publishMessageFromParent2String,
                source: dummyParent
            });
            postMessageHandler({
                data: publishMessageFromChild2String,
                source: dummyChild2
            });

            appstore.events.unsubscribe(channel);
            postMessageHandler({
                data: unsubscribeMessageFromChildString,
                source: dummyChild
            });

            postMessageHandler({
                data: '',
                source: dummyChild2
            });

            expect(appstore.util.console.log.calls.allArgs()).toEqual([
                [ 'Sender: "." subsribes for the channel: "TEST_CHANNEL"' ],
                [ 'Sender: "." sends message to the top receiver in channel: "TEST_CHANNEL" with message body:',
                    subscribeMessageToParent ],
                [ 'Receiver: "." got from sender: "child" message in channel: "TEST_CHANNEL" with message body:',
                    subscribeMessageFromChild ],
                [ 'Receiver: "." subscribes underlying sender: "child" for channel: "TEST_CHANNEL"' ],
                [ 'Sender: "." sends message to the top receiver in channel: "TEST_CHANNEL" with message body:',
                    subscribeMessageToParent ],
                [ 'Sender: "." publishes event in channel: "TEST_CHANNEL" with data:',
                    publishMessageFromCurrent.data ],
                [ 'Receiver: "." got from sender: ".." message in channel: "TEST_CHANNEL" with message body:',
                    publishMessageFromParent ],
                [ 'Sender: "." sends message to the underlying receiver: "child" in channel: "TEST_CHANNEL" with' +
                    ' message body:',
                    publishMessageFromCurrent ],
                [ 'Receiver: "." got from sender: ".." message in channel: "TEST_CHANNEL2" with message body:',
                    publishMessageFromParent2 ],
                [ 'Receiver: "." got from sender: "child2" message in channel: "TEST_CHANNEL" with message body:',
                    publishMessageFromChild2 ],
                [ 'Sender: "." sends message to the underlying receiver: "child" in channel: "TEST_CHANNEL" with ' +
                    'message body:',
                    publishMessageFromCurrent ],
                [ 'Sender: "." sends message to the top receiver in channel: "TEST_CHANNEL" with message body:',
                    publishMessageFromCurrent ],
                [ 'Sender: "." unsubsribes from the channel: "TEST_CHANNEL"' ],
                [ 'Receiver: "." got from sender: "child" message in channel: "TEST_CHANNEL" with message body:',
                    unsubscribeMessageFromChild ],
                [ 'Receiver: "." unsubscribes underlying sender: "child" from channel: "TEST_CHANNEL"' ],
                [ 'Sender: "." sends message to the top receiver in channel: "TEST_CHANNEL" with message body:',
                    unsubscribeMessageToParent ],
                [ 'Receiver: "." skipped unsupported event:',
                    { data : '', source : { src : 'childSrc2', name : 'child2', contentWindow : {  } } } ]
            ]);
        });
    });

    describe('Metadata feature', function () {
        var frameId = 'frame';
        var originalParent = window.parent;
        var dummyParent = {
            src: 'parentSrc'
        };
        var originalConfig = appstore.config;
        var dummyConfig = {
            metadata: {
                key: 'value'
            }
        };

        beforeEach(function () {
            window.parent = dummyParent;
            appstore.config = dummyConfig;

            spyOn(appstore.util, 'getURLParameter').and.callFake(function (param) {
                switch (param) {
                    case 'frameId':
                        return frameId;
                    case 'parent':
                        return dummyParent.src;
                    default:
                        return null;
                }
            });

            spyOn(appstore.util, 'postMessage');
        });

        afterEach(function () {
            window.parent = originalParent;
            appstore.config = originalConfig;
        });

        it('should post metadata to parent window', function () {
            var message = JSON.stringify({
                type: 'metadataReadyCall',
                frameId: frameId,
                metadata: dummyConfig.metadata
            });

            appstore.util.onLoadHandlers[onLoadHandlers.metadata]();

            expect(appstore.util.getURLParameter.calls.allArgs()).toEqual([
                ['frameId'],
                ['parent']
            ]);
            expect(appstore.util.postMessage).toHaveBeenCalledWith(message, dummyParent.src, dummyParent);
        });

        it('should post empty metadata to parent window if config is empty', function () {
            var message = JSON.stringify({
                type: 'metadataReadyCall',
                frameId: frameId,
                metadata: {}
            });

            appstore.config = {};
            appstore.util.onLoadHandlers[onLoadHandlers.metadata]();

            expect(appstore.util.getURLParameter.calls.allArgs()).toEqual([
                ['frameId'],
                ['parent']
            ]);
            expect(appstore.util.postMessage).toHaveBeenCalledWith(message, dummyParent.src, dummyParent);
        });
    });

    describe('Integration feature', function () {
        var dummyContainer = {
            nodeType: 1,
            innerHTML: '',
            children: [{}]
        };

        beforeEach(function () {
            spyOn(document, 'getElementById').and.returnValue(dummyContainer);
        });

        it('should allow to create an iframe application passing container id', function () {
            var expected = '<iframe id="frameId" name="frameId" src="signedUrl&frameId=frameId"></iframe>';
            var frame;

            frame = appstore.addApplication('frameId', 'containerId', null, 'signedUrl');
            expect(dummyContainer.innerHTML).toEqual(expected);
            expect(frame).toEqual(dummyContainer.children[0]);
        });

        it('should allow to create an iframe application passing DOM element as a container', function () {
            var expected = '<iframe id="frameId" name="frameId" src="signedUrl&frameId=frameId"></iframe>';
            var frame;

            frame = appstore.addApplication('frameId', dummyContainer, null, 'signedUrl');
            expect(dummyContainer.innerHTML).toEqual(expected);
            expect(frame).toEqual(dummyContainer.children[0]);
        });

        it('should allow to create an iframe application with specified attributes', function () {
            var expected = '<iframe attr1="val1" id="frameId" name="frameId" src="signedUrl&frameId=frameId"></iframe>';
            var frame;

            frame = appstore.addApplication('frameId', 'containerId', {attr1: 'val1'}, 'signedUrl');
            expect(dummyContainer.innerHTML).toEqual(expected);
            expect(frame).toEqual(dummyContainer.children[0]);
        });

        it('should validate undefined iframe id or application URL', function () {
            expect(function () {
                appstore.addApplication(null, 'containerId', null, 'signedUrl');
            }).toThrow();
            expect(function () {
                appstore.addApplication('frameId', 'containerId', null);
            }).toThrow();
        });
    });

    describe('Preferences feature', function () {
        var originalConfig = appstore.config;
        var dummyConfig = {
            prefs: (function () {
                var prefs = {
                    'Pref1': '1',
                    'Pref2': '2'
                };
                return {
                    getPrefsNames: function () {
                        return ['Pref1', 'Pref2'];
                    },
                    getString: function (name) {
                        return prefs[name];
                    },
                    getType: function () {
                        return 'INTEGER';
                    },
                    getPossibleValues: function (name) {
                        return prefs[name];
                    }
                };
            }())
        };

        beforeEach(function () {
            appstore.config = dummyConfig;
            appstore.util.onLoadHandlers[onLoadHandlers.prefs]();
        });

        afterEach(function () {
            appstore.config = originalConfig;
        });

        it('should allow an acces to preferencies', function () {
            var prefs = appstore.prefs.get();
            expect(prefs.Pref1).toBe('1');
            expect(prefs.Pref2).toBe('2');
        });

        it('should allow to validate preferencies', function () {
            var result = appstore.prefs.validate();
            expect(result.isValid).toBe(true);
        });
    });

    describe('Ready feature', function () {
        it('should set api version', function () {
            expect(appstore.apiVersion).toEqual('widget');
        });

        it('should call ready handlers on widget ready amd able to cancel', function () {
            var ready1Called = false;
            var ready2Called = false;
            var ready3Called = false;

            appstore.ready(function () {
                ready1Called = true;
            });

            appstore.cancelReady();

            appstore.ready(function () {
                ready2Called = true;
            });

            appstore.ready(function () {
                ready3Called = true;
            });

            appstore.util.onLoadHandlers[onLoadHandlers.ready]();
            expect(ready1Called).toEqual(false);
            expect(ready2Called).toEqual(true);
            expect(ready3Called).toEqual(true);
        });

        it('should call ready handlers after widget ready', function () {
            var ready1Called = false;
            var ready2Called = false;

            appstore.ready(function () {
                ready1Called = true;
            });

            appstore.ready(function () {
                ready2Called = true;
            });

            expect(ready1Called).toEqual(true);
            expect(ready2Called).toEqual(true);
        });
    });

    describe('Resource access feature', function () {
        it('should provide base url to load resources dynamically', function () {
            appstore.util.onLoadHandlers[onLoadHandlers.resource]();
            expect(appstore.resourceUrl).toEqual('');
        });
    });

    describe('Security application feature', function () {
        // TODO: add security test
    });

    describe('Security common feature', function () {
        it('should reply on a security handshake', function () {
            var synEvent = {
                origin: '<%%=viewerUrl%%>',
                data: 'appstore:12345678',
                source: {
                    postMessage: function () {}
                }
            };

            spyOn(synEvent.source, 'postMessage');
            spyOn(appstore.events, 'getContext').and.returnValue({
                key: 'value'
            });

            window.postMessageListeners[postMessageHandlers.securityCommon](synEvent);

            expect(synEvent.source.postMessage).toHaveBeenCalledWith(
                '{"secret":"appstore:12345678","URL":"' + document.URL + '","eventsContext":{"key":"value"}}',
                synEvent.origin
            );
        });

        it('should not reply on a security handshake to unexpected source', function () {
            var synEvent = {
                origin: '<%= hackerUrl %>',
                data: 'appstore:12345678',
                source: {
                    postMessage: function () {}
                }
            };

            spyOn(synEvent.source, 'postMessage');
            spyOn(appstore.events, 'getContext').and.returnValue({
                key: 'value'
            });

            window.postMessageListeners[postMessageHandlers.securityCommon](synEvent);

            expect(synEvent.source.postMessage).not.toHaveBeenCalled();
        });

        it('should not reply on a security handshake with unexpected data', function () {
            var synEvent = {
                origin: '<%= hackerUrl %>',
                data: 'hackstore:12345678',
                source: {
                    postMessage: function () {}
                }
            };

            spyOn(synEvent.source, 'postMessage');
            spyOn(appstore.events, 'getContext').and.returnValue({
                key: 'value'
            });

            window.postMessageListeners[postMessageHandlers.securityCommon](synEvent);

            expect(synEvent.source.postMessage).not.toHaveBeenCalled();
        });
    });

    describe('Socket feature', function () {
        var dummyWebSocketInstance;
        var dummyConfig = {
            datasourceActivProxyUrl: 'activProxyUrl',
            dataSourceProxyToken: 'token'
        };
        var originalConfig = appstore.config;

        beforeEach(function () {
            appstore.config = dummyConfig;

            dummyWebSocketInstance = {
                send: function () {},
                close: function () {}
            };

            spyOn(window, 'WebSocket').and.returnValue(dummyWebSocketInstance);
            spyOn(dummyWebSocketInstance, 'send');
            spyOn(dummyWebSocketInstance, 'close');

            appstore.util.onLoadHandlers[onLoadHandlers.socket]();
        });

        afterEach(function () {
            appstore.config = originalConfig;
        });

        it('should create a web socket connection with params', function () {
            appstore.socket.createSocket({
                dataSourceId: 'vendor.source',
                path: 'path',
                params: {
                    key: 'value=',
                    key1: '+value'
                }
            });

            expect(window.WebSocket).toHaveBeenCalledWith(
                'activProxyUrl/vendor.source/path?key=value%3D&key1=%2Bvalue&accessToken=token');
            expect(dummyWebSocketInstance.onopen).toBeDefined();
            expect(dummyWebSocketInstance.onclose).toBeDefined();
            expect(dummyWebSocketInstance.onmessage).toBeDefined();
            expect(dummyWebSocketInstance.onerror).toBeDefined();
        });

        it('should create a web socket connection without params', function () {
            appstore.socket.createSocket({
                dataSourceId: 'vendor.source',
                path: 'path'
            });

            expect(window.WebSocket).toHaveBeenCalledWith('activProxyUrl/vendor.source/path?accessToken=token');
            expect(dummyWebSocketInstance.onopen).toBeDefined();
            expect(dummyWebSocketInstance.onclose).toBeDefined();
            expect(dummyWebSocketInstance.onmessage).toBeDefined();
            expect(dummyWebSocketInstance.onerror).toBeDefined();
        });

        it('should create a web socket connection without path', function () {
            appstore.socket.createSocket({
                dataSourceId: 'vendor.source'
            });

            expect(window.WebSocket).toHaveBeenCalledWith('activProxyUrl/vendor.source?accessToken=token');
            expect(dummyWebSocketInstance.onopen).toBeDefined();
            expect(dummyWebSocketInstance.onclose).toBeDefined();
            expect(dummyWebSocketInstance.onmessage).toBeDefined();
            expect(dummyWebSocketInstance.onerror).toBeDefined();
        });

        it('should send message to a socket', function () {
            appstore.socket.createSocket({
                dataSourceId: 'vendor.source'
            });

            appstore.socket.sendMessage('message');

            expect(dummyWebSocketInstance.send).toHaveBeenCalledWith('message');
        });

        it('should close socket connection', function () {
            appstore.socket.createSocket({
                dataSourceId: 'vendor.source'
            });

            appstore.socket.close();

            expect(dummyWebSocketInstance.close).toHaveBeenCalled();
        });

        it('should notify about new data', function () {
            var receivedData = [];

            appstore.socket.createSocket({
                dataSourceId: 'vendor.source',
                dataCallback: function (data) {
                    receivedData.push(data);
                },
                errorCallback: function () {}
            });

            dummyWebSocketInstance.onmessage({
                data: 1
            });

            dummyWebSocketInstance.onmessage({
                data: 2
            });

            expect(receivedData).toEqual([1, 2]);
        });

        it('should notify about error', function () {
            var errorMessage;

            appstore.socket.createSocket({
                dataSourceId: 'vendor.source',
                dataCallback: function () {},
                errorCallback: function (error) {
                    errorMessage = error;
                }
            });

            dummyWebSocketInstance.onerror('error');

            expect(errorMessage).toEqual('error');
        });
    });

    describe('Symbology resolution feature', function () {
        var successCallback, errorCallback;

        beforeEach(function () {
            spyOn(appstore, 'ajax').and.callFake(function () {
                return {
                    success: function (callback) {
                        successCallback = callback;
                        return this;
                    },
                    error: function (callback) {
                        errorCallback = callback;
                        return this;
                    }
                };
            });

            spyOn(appstore.prefs, 'get').and.returnValue({
                GLOBAL_PREFERRED_COUNTRY: 'US'
            });

            successCallback = null;
            errorCallback = null;

            jasmine.clock().install();

            appstore.util.onLoadHandlers[onLoadHandlers.symbology]();
        });

        afterEach(function () {
            jasmine.clock().uninstall();
        });

        it('should make convertion from one symbology to another', function () {
            appstore.symbology.resolve({
                sourceType: 'RIC',
                targetType: 'Ticker',
                symbols: ['R1', 'R2'],
                callback: function () {
                }
            });

            expect(appstore.ajax).toHaveBeenCalledWith({
                dataSourceId : 'tr.symbology',
                path : 'resolve',
                params: {
                    symbols : [ 'R1', 'R2' ],
                    sourcetype : 'RIC',
                    targettype : 'Ticker',
                    preferredcountry : 'US',
                    preferredexchange: ''
                }
            });
            expect(successCallback).not.toBeNull();
            expect(errorCallback).not.toBeNull();
        });

        it('should validate undefined request before conversion', function () {
            var r = function () {
                appstore.symbology.resolve(undefined);
            };
            expect(r).toThrow();
        });

        it('should validate source type before conversion', function () {
            var r = function () {
                appstore.symbology.resolve({
                    targetType: 'Isin',
                    symbols: ['T1'],
                    callback: function () {
                    }
                });
            };
            expect(r).toThrow();

            r = function () {
                appstore.symbology.resolve({
                    sourceType: [],
                    targetType: 'Isin',
                    symbols: ['T1'],
                    callback: function () {
                    }
                });
            };
            expect(r).toThrow();
        });

        it('should validate target type before conversion', function () {
            var r = function () {
                appstore.symbology.resolve({
                    sourceType: 'Isin',
                    symbols: ['T1'],
                    callback: function () {
                    }
                });
            };
            expect(r).toThrow();
            r = function () {
                appstore.symbology.resolve({
                    sourceType: 'Isin',
                    targetType: 1,
                    symbols: ['T1'],
                    callback: function () {
                    }
                });
            };
            expect(r).toThrow();
        });

        it('should validate symbols before conversion', function () {
            var r = function () {
                appstore.symbology.resolve({
                    sourceType: 'RIC',
                    targetType: 'Isin',
                    callback: function () {
                    }
                });
            };
            expect(r).toThrow();

            r = function () {
                appstore.symbology.resolve({
                    sourceType: 'RIC',
                    targetType: 'Isin',
                    symbols: [],
                    callback: function () {
                    }
                });
            };
            expect(r).toThrow();

            r = function () {
                appstore.symbology.resolve({
                    sourceType: 'RIC',
                    targetType: 'Isin',
                    symbols: 's',
                    callback: function () {
                    }
                });
            };
            expect(r).toThrow();
        });

        it('should validate preferred country before conversion', function () {
            var r = function () {
                appstore.symbology.resolve({
                    sourceType: 'RIC',
                    targetType: 'Ticker',
                    symbols: ['R1', 'R2'],
                    preferredCountry: 0,
                    callback: function () {
                    }
                });
            };
            expect(r).toThrow();
        });

        it('should validate preferred exchange before conversion', function () {
            var r = function () {
                appstore.symbology.resolve({
                    sourceType: 'RIC',
                    targetType: 'Ticker',
                    symbols: ['R1', 'R2'],
                    preferredExchange: 0,
                    callback: function () {
                    }
                });
            };
            expect(r).toThrow();
        });

        it('should validate callback function before conversion', function () {
            var r = function () {
                appstore.symbology.resolve({
                    sourceType: 'RIC',
                    targetType: 'Ticker',
                    symbols: ['R1', 'R2']
                });
            };
            expect(r).toThrow();
        });

        it('should handle success received response', function () {
            var receivedResponse;
            var expectedResponse = { testProp: 'testValue' };

            appstore.symbology.resolve({
                sourceType: 'Ric',
                targetType: 'Ticker',
                symbols: ['R1'],
                callback: function (response) {
                    receivedResponse = response;
                }
            });

            jasmine.clock().tick(1);
            successCallback(expectedResponse);
            expect(receivedResponse).toEqual(expectedResponse);
        });

        it('should allow to initialize a list of symbols to convert', function () {
            appstore.symbology.init([
                { source: 'Ilx', target: 'Ticker' },
                { source: 'Ilx', target: 'RIC' }
            ]);

            var pairs = appstore.symbology.getResolveMap();
            expect(pairs.length).toEqual(2);
            expect(pairs[0].source).toEqual('Ilx');
            expect(pairs[0].target).toEqual('Ticker');
            expect(pairs[1].source).toEqual('Ilx');
            expect(pairs[1].target).toEqual('RIC');
        });
    });

    describe('Util feature', function () {
        it('should register and run onload handlers', function () {
            var callNumber = 0;
            var firstCall, secondCall;

            var originalHandlers = [].concat(appstore.util.onLoadHandlers);

            appstore.util.onLoadHandlers.length = 0;
            appstore.util.registerOnLoadHandler(function () {
                firstCall = ++callNumber;
            });
            appstore.util.registerOnLoadHandler(function () {
                secondCall = ++callNumber;
            });

            appstore.util.runOnLoadHandlers();

            expect(firstCall).toEqual(1);
            expect(secondCall).toEqual(2);

            appstore.util.onLoadHandlers = originalHandlers;
        });

        it('should format string value', function () {
            var format = '{0}-{1}-{2}-{3}!';
            var expected = 'this-test-is-cool!';

            expect(appstore.util.format(format, 'this', 'test', 'is', 'cool')).toEqual(expected);
        });

        it('should proxy console', function () {
            expect(appstore.util.console).toEqual(window.console);
        });

        it('should proxy local storage', function () {
            expect(appstore.util.localStorage).toEqual(window.localStorage);
        });

        it('should post message to a target', function () {
            var target = {
                postMessage: function () {}
            };

            spyOn(target, 'postMessage');
            appstore.util.postMessage('hello', 'url', target);
            expect(target.postMessage).toHaveBeenCalledWith('hello', 'url');
        });

        it('should register post message listener', function () {
            var listener = function () {};

            spyOn(window, 'addEventListener').and.callFake(function () {});
            appstore.util.receiveMessage(listener);
            expect(window.addEventListener).toHaveBeenCalledWith('message', listener, false);
        });

        it('should register post message listener in IE', function () {
            var listener = function () {};
            var originalAddeventListener = window.addEventListener;
            window.addEventListener = undefined;
            window.attachEvent = function () {};

            spyOn(window, 'attachEvent').and.callFake(function () {});
            appstore.util.receiveMessage(listener);
            expect(window.attachEvent).toHaveBeenCalledWith('onmessage', listener);

            window.addEventListener = originalAddeventListener;
            window.attachEvent = undefined;
        });

        it('should check whether the value is object', function () {
            expect(appstore.util.isObject([])).toBeFalsy();
            expect(appstore.util.isObject({})).toBeTruthy();
            expect(appstore.util.isObject('')).toBeFalsy();
            expect(appstore.util.isObject(true)).toBeFalsy();
        });

        it('should stringify params', function () {
            expect(appstore.util.stringifyParams({
                a: 'a',
                b: 'b=',
                c: ['d', 'e', '=']
            })).toEqual('a=a&b=b%3D&c=d%7Ce%7C%3D');
        });

        it('should create request uri', function () {
            expect(appstore.util.createRequestUri({
                dataSourceId: 'datasource',
                path: 'quotes',
                params: {
                    a: '=',
                    b: '+'
                }
            })).toEqual('datasource/quotes?a=%3D&b=%2B');

            expect(appstore.util.createRequestUri({
                dataSourceId: 'datasource',
                path: 'quotes',
                params: []
            })).toEqual('datasource/quotes');
        });

        it('should encode base64 data', function () {
            expect(appstore.util.base64.encode('test string')).toEqual('dGVzdCBzdHJpbmc=');
        });

        it('should decode base64 data', function () {
            expect(appstore.util.base64.decode('dGVzdCBzdHJpbmc')).toEqual('test string');
        });

        it('should provide token data', function () {
            spyOn(appstore.util, 'getURLParameter').and.callFake(function () {
                return 'sdfsdfd.eyJrZXkiOiAidmFsdWUifQ==';
            });

            expect(appstore.util.getTokenData()).toEqual({
                key: 'value'
            });
        });

        it('should log error for invalid token', function () {
            spyOn(appstore.util, 'getURLParameter').and.callFake(function () {
                return null;
            });
            spyOn(appstore.util.console, 'error');

            expect(appstore.util.getTokenData()).toEqual(null);
            expect(appstore.util.console.error).toHaveBeenCalledWith('Token is empty. Token is required parameter.');
        });

        it('should log error for invalid token body (base64)', function () {
            spyOn(appstore.util, 'getURLParameter').and.callFake(function () {
                return 'sdfsdfd.eyJrZXkiOiAidmFsdWUif==';
            });
            spyOn(appstore.util.console, 'error');

            expect(appstore.util.getTokenData()).toEqual(null);
            expect(appstore.util.console.error).toHaveBeenCalledWith('Unable to parse token body',
                'Cannot decode base64');
        });

        it('should log error for invalid token body (json)', function () {
            spyOn(appstore.util, 'getURLParameter').and.callFake(function () {
                return 'sdfsdfd.eyJrZXkiOiB2YWx1ZX0=';
            });
            spyOn(appstore.util.console, 'error');

            expect(appstore.util.getTokenData()).toEqual(null);
            expect(appstore.util.console.error).toHaveBeenCalledWith('Unable to parse token body',
                'SyntaxError: Unable to parse JSON string');
        });

        it('should generate a guid', function () {
            var guid1 = appstore.util.guid();
            var guid2 = appstore.util.guid();

            expect(guid1).not.toEqual(guid2);
            expect(guid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            expect(guid2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });
    });

    describe('Resize feature', function () {
        it('should allow to subscribe to resize event', function () {
            var width, height;
            var subscribeCallbackCalled = false;

            appstore.util.onLoadHandlers[onLoadHandlers.resize]();

            window.innerWidth = '100px';
            window.innerHeight = '200px';

            appstore.resize(function (w, h) {
                subscribeCallbackCalled = true;
                width = w;
                height = h;
            });
            window.dummyResizeEventHandler();
            expect(width).toEqual(100);
            expect(height).toEqual(200);
            expect(subscribeCallbackCalled).toEqual(true);

            //call callback with old params
            subscribeCallbackCalled = false;
            window.dummyResizeEventHandler();
            expect(subscribeCallbackCalled).toEqual(false);

            //change window height and width 
            //and call callaback
            window.innerWidth = '110px';
            window.innerHeight = '210px';
            window.dummyResizeEventHandler();
            expect(subscribeCallbackCalled).toEqual(true);
            expect(width).toEqual(110);
            expect(height).toEqual(210);
        });
    });
});