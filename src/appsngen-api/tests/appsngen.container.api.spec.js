describe('The appstore.api.container suite', function () {
    'use strict';

    var postMessageHandlers = {
        events: 0,
        metadata: 1,
        adjustHeightCommon: 2,
        securityCommon: 3
    };

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
        var metadata = {
            key: 'value'
        };
        var frameId = 'childFrame';

        beforeEach(function(){
            jasmine.clock().install();
        });

        afterEach(function(){
            jasmine.clock().uninstall();
        });

        it('should report metadata to callback', function () {
            var message = JSON.stringify({
                type: 'metadataReadyCall',
                frameId: frameId,
                metadata: metadata
            });
            var receivedFrameId;
            var receivedMetadata;
            var messageHandler = window.postMessageListeners[postMessageHandlers.metadata];

            appstore.events.metadata.ready(function (frameId, metadata) {
                receivedFrameId = frameId;
                receivedMetadata = metadata;
            });

            messageHandler({
                data: message
            });

            jasmine.clock().tick(1);
            expect(receivedFrameId).toEqual(frameId);
            expect(receivedMetadata).toEqual(metadata);
        });

        it('should return frame metadata on get', function () {
            var receivedMetadata = appstore.events.metadata.get(frameId);

            expect(receivedMetadata).toEqual(metadata);
        });

        it('should return all metadata on get', function () {
            var receivedMetadata = appstore.events.metadata.get();
            var expected = {};
            expected[frameId] = metadata;

            expect(receivedMetadata).toEqual(expected);
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

    describe('Ready feature', function () {
        it('should set api version', function () {
            expect(appstore.apiVersion).toEqual('container');
        });
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
});