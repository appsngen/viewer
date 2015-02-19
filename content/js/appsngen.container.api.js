!function(a){"use strict";var b=function(){},c={},d=a.appstore||{},e=[];d.util={noop:b,onLoadHandlers:e,registerOnLoadHandler:function(a){e.push(a)},runOnLoadHandlers:function(){var a;for(a=0;a<e.length;a++)e[a]()},getURLParameter:function(a){var b=(new RegExp(a+"=(.+?)(&|$)").exec(location.search)||[null,null])[1];return b&&(b=decodeURIComponent(b)),b},format:function(a){var b;for(b=1;b<arguments.length;b++)a=a.replace(new RegExp("\\{"+(b-1)+"\\}","gm"),arguments[b]);return a},console:a.console||{log:b,error:b,warn:b,info:b},localStorage:a.localStorage||{getItem:function(a){return c[a]},setItem:function(a,b){c[a]=b},removeItem:function(a){delete c[a]},clear:function(){c={}},length:0},postMessage:function(a,b,c){c.postMessage(a,b)},receiveMessage:function(b){a.addEventListener?a.addEventListener("message",b,!1):a.attachEvent("onmessage",b)},isObject:function(a){return!(!a||a.constructor!==Object)},stringifyParams:function(a){var b,c,d=[];for(c in a)a.hasOwnProperty(c)&&d.push(a[c]instanceof Array?c+"="+encodeURIComponent(a[c].join("|")):c+"="+encodeURIComponent([a[c]].join("")));return b=d.join("&")},createRequestUri:function(a){var b,c=a.dataSourceId;return a.path&&(a.path="/"===a.path.charAt(0)?a.path:"/"+a.path,c+=a.path),this.isObject(a.params)&&(b=this.stringifyParams(a.params),""!==b&&(c+="?"+b)),c},base64:function(){var a="=",b="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",c=function(a,c){var d=b.indexOf(a.charAt(c));if(-1===d)throw"Cannot decode base64";return d},d=function(b){for(;b.length%4!==0;)b+="=";b=""+b;var d,e,f,g=b.length;if(0===g)return b;if(g%4!==0)throw"Cannot decode base64";d=0,b.charAt(g-1)===a&&(d=1,b.charAt(g-2)===a&&(d=2),g-=4);var h=[];for(e=0;g>e;e+=4)f=c(b,e)<<18|c(b,e+1)<<12|c(b,e+2)<<6|c(b,e+3),h.push(String.fromCharCode(f>>16,f>>8&255,255&f));switch(d){case 1:f=c(b,e)<<18|c(b,e+1)<<12|c(b,e+2)<<6,h.push(String.fromCharCode(f>>16,f>>8&255));break;case 2:f=c(b,e)<<18|c(b,e+1)<<12,h.push(String.fromCharCode(f>>16))}return h.join("")},e=function(a,b){var c=a.charCodeAt(b);if(c>255)throw"INVALID_CHARACTER_ERR: DOM Exception 5";return c},f=function(c){if(1!==arguments.length)throw"SyntaxError: Not enough arguments";var d,f,g=[];c=""+c;var h=c.length-c.length%3;if(0===c.length)return c;for(d=0;h>d;d+=3)f=e(c,d)<<16|e(c,d+1)<<8|e(c,d+2),g.push(b.charAt(f>>18)),g.push(b.charAt(f>>12&63)),g.push(b.charAt(f>>6&63)),g.push(b.charAt(63&f));switch(c.length-h){case 1:f=e(c,d)<<16,g.push(b.charAt(f>>18)+b.charAt(f>>12&63)+a+a);break;case 2:f=e(c,d)<<16|e(c,d+1)<<8,g.push(b.charAt(f>>18)+b.charAt(f>>12&63)+b.charAt(f>>6&63)+a)}return g.join("")};return{encode:f,decode:d}}(),getTokenData:function(){var a,b,c=d.util.getURLParameter("token");if(!c)return d.util.console.error("Token is empty. Token is required parameter."),null;a=c.split(".")[1];try{b=JSON.parse(d.util.base64.decode(a))}catch(e){return d.util.console.error("Unable to parse token body",e.toString()),null}return b},guid:function(){var a=function(){return Math.floor(65536*(1+Math.random())).toString(16).substring(1)};return function(){return a()+a()+"-"+a()+"-"+a()+"-"+a()+"-"+a()+a()+a()}}()},a.appstore=d}(window),function(a){"use strict";a.events=function(){var b={},c={},d=[],e="appstore-events-context",f=function(b){var c;c=JSON.stringify(b);try{a.util.localStorage.setItem(e,c)}catch(d){localStorage.removeItem(e)}},g=function(){return a.util.getURLParameter("frameId")||window.name||"."},h=function(){var b,c=a.util.localStorage.getItem(e);return c?(b=JSON.parse(c),b instanceof Array||(b=[])):b=[],b},i=function(a){var b;for(d.unshift({channel:a.channel,data:a.data}),b=1;b<d.length;b++)if(d[b].channel===a.channel){d.splice(b,1);break}f(d)},j=function(){return h()},k=function(a){f(a),d=h()},l=function(){d=[],a.util.localStorage.removeItem(e)},m=function(a){var b;try{b=JSON.parse(a)}catch(c){}return b&&b.type&&b.sender&&b.data?b:{type:"unsupported",data:{}}},n=function(b){var c,d,e,f=a.util.getURLParameter("parent"),h=g();window!==window.parent&&f&&(e=JSON.parse(JSON.stringify(b)),e.sender=h,a.events.debug&&(d='Sender: "{0}" sends message to the top receiver in channel: "{1}" with message body:',c=a.util.format(d,h,e.data.channel),a.util.console.log(c,e)),a.util.postMessage(JSON.stringify(e),f,window.parent))},o=function(c){var d,e,f=b[c.data.channel],h=g();f||(f={}),a.events.debug&&(e='Receiver: "{0}" subscribes underlying sender: "{1}" for channel: "{2}"',d=a.util.format(e,h,c.sender,c.data.channel),a.util.console.log(d)),f[c.sender]=!0,b[c.data.channel]=f,n(c)},p=function(c){var d,e,f=g();a.events.debug&&(e='Receiver: "{0}" unsubscribes underlying sender: "{1}" from channel: "{2}"',d=a.util.format(e,f,c.sender,c.data.channel),a.util.console.log(d)),b[c.data.channel]&&delete b[c.data.channel][c.sender],t(c.channel)&&n(c)},q=function(b,c){var d,e,f=g();a.events.debug&&(e='Sender: "{0}" sends message to the underlying receiver: "{1}" in channel: "{2}" with message body:',d=a.util.format(e,f,b,c.data.channel),a.util.console.log(d,c))},r=function(c){var d,e,f,h,i,j=g();d=b[c.data.channel]||{};for(e in d)d.hasOwnProperty(e)&&e!==c.sender&&(f=document.getElementById(e),f&&(i=JSON.parse(JSON.stringify(c)),i.sender=j,q(e,i),h=JSON.stringify(i),a.util.postMessage(h,f.src,f.contentWindow)))},s=function(b,d){var e,f,h,j=g();r(b),d||n(b),i(b.data),h=c[b.data.channel],h&&b.sender!==j&&(a.events.debug&&(f='Receiver: "{0}" calls message handler in channel: "{1}" from sender: "{2}" with data:',e=a.util.format(f,j,b.data.channel,b.sender),a.util.console.log(e,b.data.data)),h(b.data.channel,b.data.data,b.sender))},t=function(a){var d,e=[];if(b[a])for(d in b[a])b[a].hasOwnProperty(d)&&e.push(d);return c[a]&&e.push(g()),0===e.length};return d=h(),a.util.receiveMessage(function(b){var c,d,e=m(b.data),f=b.source===window.parent,h=g();"unsupported"!==e.type?(a.events.debug&&(d='Receiver: "{0}" got from sender: "{1}" message in channel: "{2}" with message body:',c=a.util.format(d,h,e.sender,e.data.channel),a.util.console.log(c,e)),"subscribe"===e.type?f||o(e):"publish"===e.type?s(e,f):"unsubscribe"===e.type&&(f||p(e))):a.events.debug&&(d='Receiver: "{0}" skipped unsupported event:',c=a.util.format(d,h),a.util.console.log(c,b))}),{subscribe:function(b,d){var e,f,h=g(),i={type:"subscribe",sender:h,data:{channel:b}};return c[b]=d,a.events.debug&&(f='Sender: "{0}" subsribes for the channel: "{1}"',e=a.util.format(f,h,b),a.util.console.log(e)),n(i),this},unsubscribe:function(b){var d,e,f=g(),h={type:"unsubscribe",sender:f,data:{channel:b}};return delete c[b],a.events.debug&&(e='Sender: "{0}" unsubsribes from the channel: "{1}"',d=a.util.format(e,f,b),a.util.console.log(d)),t(b)&&n(h),this},publish:function(b,c){var d,e,f=g(),h={type:"publish",sender:f,data:{channel:b}};return a.events.debug&&(e='Sender: "{0}" publishes event in channel: "{1}" with data:',d=a.util.format(e,f,b),a.util.console.log(d,c)),h.data.data=JSON.parse(JSON.stringify(c)),setTimeout(function(){s(h,!1)},0),this},getContext:j,setContext:k,resetContext:l,debug:!1}}()}(appstore),function(a){"use strict";a.events.metadata=function(){var b={},c=a.util.noop;return a.util.receiveMessage(function(a){var d;try{d=JSON.parse(a.data)}catch(e){}d&&"metadataReadyCall"===d.type&&d.frameId&&d.metadata&&(b[d.frameId]=d.metadata,c(d.frameId,d.metadata))}),{ready:function(a){var d,e;c=a,e=function(a){return function(){c(a,b[a])}};for(d in b)b.hasOwnProperty(d)&&setTimeout(e(d),0)},get:function(a){var c=a?b[a]:b;return c?JSON.parse(JSON.stringify(c)):void 0}}}()}(appstore),function(a){"use strict";var b=!0;a.dynamicHeight={enable:function(){b=!0},disable:function(){b=!1}},a.util.receiveMessage(function(c){var d,e,f;try{d=JSON.parse(c.data)}catch(g){}d&&"adjustHeightCall"===d.type&&d.frameId&&d.data&&b&&(f=document.getElementById(d.frameId),f&&(f.style.height=d.data.height+"px",e=JSON.stringify({type:"adjustHeightReply",data:d.data}),a.util.postMessage(e,f.src,f.contentWindow)))})}(appstore),function(a){"use strict";a.addApplication=function(a,b,c,d){var e,f="<iframe",g=b,h=function(a){return a&&"object"==typeof a&&a.nodeType&&1===a.nodeType};if("string"==typeof b||b instanceof String?b=document.getElementById(b):h(b)&&(g=b.id),!a||!d)throw new Error("Parameters id and signedUrl are mandatory.");if(!h(b))throw new Error('DOM element with ID "'+g+'" is required to render the widget "'+a+'".');c=c||{},c.id=a.replace(/\s/g,"-"),c.name=c.id,c.src=d+"&frameId="+encodeURIComponent(c.id),c.name=c.id;for(e in c)c.hasOwnProperty(e)&&(f+=" "+e+'="'+c[e]+'"');return f+="></iframe>",b.innerHTML=f,b.children[0]}}(appstore),function(a){"use strict";var b=!1,c=function(a){var b,c,d,e,f,g;return a?(a=a.toLowerCase(),0===a.indexOf("//")&&(a=window.location.protocol+a),-1===a.indexOf("://")&&(a=window.location.protocol+"//"+a),b=a.substring(a.indexOf("://")+3),c=b.indexOf("/"),-1!==c&&(b=b.substring(0,c)),d=a.substring(0,a.indexOf("://")),e="",f=b.indexOf(":"),-1!==f&&(g=b.substring(f+1),b=b.substring(0,f),("http"===d&&"80"!==g||"https"===d&&"443"!==g)&&(e=":"+g)),d+"://"+b+e):""},d=function(d){if(c(d.origin)===c("<%%=viewerUrl%%>")&&d.data&&"string"==typeof d.data&&0===d.data.indexOf("appstore:")){b&&a.console.log("syn received from",d.origin,"at",(new Date).getTime());var e={secret:d.data,URL:document.URL,eventsContext:a.events.getContext()};b&&a.console.log("send ack to",d.origin,"at",(new Date).getTime()),d.source.postMessage(JSON.stringify(e),d.origin)}};a.util.receiveMessage(d)}(appstore),function(a){"use strict";a.apiVersion="container",a&&a.ready&&a.ready()}(appstore);