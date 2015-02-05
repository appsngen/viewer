/*
 * depends on: appstore.util, appstore.config
 * */
(function (appstore) {
    'use strict';

    appstore.util.registerOnLoadHandler(function () {
        /* Chrome|Android|OmniWeb|Safari|iCab|Konqueror|Firefox|Camino|Netscape|IE|Mozilla */
        var supportedBrowsers = appstore.config.supportedBrowsers || [];

        var BrowserDetect = {
            init: function () {
                this.browser = this.searchString(this.dataBrowser) || 'An unknown browser';
                this.version = this.searchVersion(navigator.userAgent) || this.searchVersion(navigator.appVersion) ||
                    'an unknown version';
                this.OS = this.searchString(this.dataOS) || 'an unknown OS';
            },
            searchString: function (data) {
                var i, dataString, dataProp;

                for (i = 0; i < data.length; i++) {
                    dataString = data[i].string;
                    dataProp = data[i].prop;
                    this.versionSearchString = data[i].versionSearch || data[i].identity;
                    if (dataString) {
                        if (dataString.indexOf(data[i].subString) !== -1) {
                            return data[i].identity;
                        }
                    } else if (dataProp) {
                        return data[i].identity;
                    }
                }
            },
            searchVersion: function (dataString) {
                var index = dataString.indexOf(this.versionSearchString);
                if (index === -1) {
                    return;
                }

                return parseFloat(dataString.substring(index + this.versionSearchString.length + 1));
            },
            dataBrowser: [
                {
                    string: navigator.userAgent,
                    subString: 'Chrome',
                    identity: 'Chrome'
                },
                {
                    string: navigator.userAgent,
                    subString: 'Android',
                    identity: 'Android'
                },
                {
                    string: navigator.userAgent,
                    subString: 'OmniWeb',
                    versionSearch: 'OmniWeb/',
                    identity: 'OmniWeb'
                },
                {
                    string: navigator.vendor,
                    subString: 'Apple',
                    identity: 'Safari',
                    versionSearch: 'Version'
                },
                {
                    prop: window.opera,
                    identity: 'Opera',
                    versionSearch: 'Version'
                },
                {
                    string: navigator.vendor,
                    subString: 'iCab',
                    identity: 'iCab'
                },
                {
                    string: navigator.vendor,
                    subString: 'KDE',
                    identity: 'Konqueror'
                },
                {
                    string: navigator.userAgent,
                    subString: 'Firefox',
                    identity: 'Firefox'
                },
                {
                    string: navigator.vendor,
                    subString: 'Camino',
                    identity: 'Camino'
                },
                {
                    // for newer Netscapes (6+)
                    string: navigator.userAgent,
                    subString: 'Netscape',
                    identity: 'Netscape'
                },
                { /* IE 8-10 */
                    string: navigator.userAgent,
                    subString: 'MSIE',
                    identity: 'IE',
                    versionSearch: 'MSIE'
                },
				{ /* IE 11 */
                    string: navigator.userAgent,
                    subString: 'Trident',
                    identity: 'IE',
                    versionSearch: 'rv'
                },
                {
                    string: navigator.userAgent,
                    subString: 'Gecko',
                    identity: 'Mozilla',
                    versionSearch: 'rv'
                },
                {
                    // for older Netscapes (4-)
                    string: navigator.userAgent,
                    subString: 'Mozilla',
                    identity: 'Netscape',
                    versionSearch: 'Mozilla'
                }
            ],
            dataOS: [
                {
                    string: navigator.platform,
                    subString: 'Win',
                    identity: 'Windows'
                },
                {
                    string: navigator.platform,
                    subString: 'Mac',
                    identity: 'Mac'
                },
                {
                    string: navigator.userAgent,
                    subString: 'iPhone',
                    identity: 'iPhone/iPod'
                },
                {
                    string: navigator.userAgent,
                    subString: 'Android',
                    identity: 'Android'
                },
                {
                    string: navigator.platform,
                    subString: 'Linux',
                    identity: 'Linux'
                }
            ]
        };
        var isBrowserSupported = function () {
            var i;
            var isSupported = false;

            if (!supportedBrowsers.length) {
                return true;
            }

            for (i = 0; i < supportedBrowsers.length; i++) {
                if (supportedBrowsers[i].browser.toLowerCase() === BrowserDetect.browser.toLowerCase()) {
                    if (!supportedBrowsers[i].version || BrowserDetect.version >= supportedBrowsers[i].version) {
                        isSupported = true;
                        break;
                    }
                }
            }

            return isSupported;
        };
		
        BrowserDetect.init();
		
        if (!isBrowserSupported()) {
            var browserList = [], supportedBrowser, unsupportedBrowserUrl, i;

            for (i = 0; i < supportedBrowsers.length; i++) {
                supportedBrowser = supportedBrowsers[i];
                browserList.push(supportedBrowser.browser + ' ' + supportedBrowser.version);
            }

            appstore.cancelReady();
            unsupportedBrowserUrl = appstore.config.unsupportedBrowserUrl;
            location.href = unsupportedBrowserUrl + '?supportedBrowsers=' + browserList.join(',');
        }
    });
}(appstore));