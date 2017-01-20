/*******************************************************************************

    uBO-Extra - A companion extension to uBlock Origin: to gain ability to
                foil early hostile anti-user mechanisms working around
                content blockers.
    Copyright (C) 2016 Raymond Hill

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see {http://www.gnu.org/licenses/}.

    Home: https://github.com/gorhill/uBO-WebSocket
*/

/* global HTMLDocument, XMLDocument */

/*******************************************************************************

    All scriptlets to inject: the scriptlets to inject are to foil or work
    around hostile anti-user mechanism used by some web sites.

**/

var scriptlets = [],
    hostname = window.location.hostname;

/*******************************************************************************

    Don't run on non-HTML documents.

**/

var abort = (function() {
    'use strict';

    var doc = document;
    if ( doc instanceof HTMLDocument === false ) {
        if (
            doc instanceof XMLDocument === false ||
            doc.createElement('div') instanceof HTMLDivElement === false
        ) {
            return true;
        }
    }
    if ( (doc.contentType || '').lastIndexOf('image/', 0) === 0 ) {
        return true; 
    }
    return false;
})();

/*******************************************************************************

    Fetch hostname from ancestors if none available (we could be executed from
    inside an anonymous frame).

**/

if ( !abort ) {
    if ( hostname === '' ) {
        hostname = (function() {
            var win = window, hn = '', max = 10;
            try {
                for (;;) {
                    hn = win.location.hostname;
                    if ( hn !== '' ) { return hn; }
                    if ( win.parent === win ) { break; }
                    win = win.parent;
                    if ( !win ) { break; }
                    if ( (max -= 1) === 0 ) { break; }
                }
            } catch(ex) {
            }
            return hn;
        })();
    }
    // Don't inject if document is from local network.
    abort = /^192\.168\.\d+\.\d+$/.test(hostname);
}

/*******************************************************************************

    Websocket abuse buster.

    https://github.com/gorhill/uBlock/issues/1936

**/

(function() {
    'use strict';

    if ( abort ) { return; }

    // https://bugs.chromium.org/p/chromium/issues/detail?id=129353
    // https://github.com/gorhill/uBlock/issues/956
    // https://github.com/gorhill/uBlock/issues/1497
    // Trap calls to WebSocket constructor, and expose websocket-based network
    // requests to uBO's filtering engine, logger, etc.
    // Counterpart of following block of code is found in "vapi-background.js" --
    // search for "https://github.com/gorhill/uBlock/issues/1497".

    /* jshint multistr: true */

    // https://github.com/gorhill/uBlock/issues/1604
    //return;

    // Fix won't be applied on older versions of Chromium.
    if (
        window.WebSocket instanceof Function === false ||
        window.WeakMap instanceof Function === false
    ) {
        return false;
    }

    // Only for dynamically created frames and http/https documents.
    if ( /^(https?:|about:)/.test(window.location.protocol) !== true ) {
        return false;
    }

    var doc = document,
        parent = doc.head || doc.documentElement;
    if ( parent === null ) {
        return false;
    }

    // WebSocket reference: https://html.spec.whatwg.org/multipage/comms.html
    // The script tag will remove itself from the DOM once it completes
    // execution.
    //
    // This new implementation was borrowed from https://github.com/kzar (ABP
    // developer), which is cleaner and does not have issues of the previous
    // implementation, see <https://github.com/gorhill/uBO-Extra/issues/12>.
    //
    // The scriptlet code below is based on this commit in ABP's repo:
    // https://github.com/adblockplus/adblockpluschrome/commit/457a336ee55a433217c3ffe5d363e5c6980f26f4#diff-c65c7b9a7a7b1819bef1a2957f08e8ceR441
    //
    // In order to respect authorship in the commit history, I manually
    // imported/adapted the changes above, then I committed these changes with
    // proper authorship proper information taken from the commit above (I did
    // not ask explicit permission, the license of both projects are GPLv3.)
    var scriptlet = function() {
        var RealWebSocket = window.WebSocket,
            closeWebSocket = Function.prototype.call.bind(RealWebSocket.prototype.close);

        var onResponseReceived = function(wrapper, ok) {
            this.onload = this.onerror = null;
            if ( !ok ) {
                closeWebSocket(wrapper);
            }
        };

        var WrappedWebSocket = function(url) {
            // Throw correct exceptions if the constructor is used improperly.
            if ( this instanceof WrappedWebSocket === false ) {
                return RealWebSocket();
            }
            if ( arguments.length < 1 ) {
                return new RealWebSocket();
            }
            var websocket = arguments.length === 1 ?
                new RealWebSocket(url) :
                new RealWebSocket(url, arguments[1]);

            var img = new Image();
            img.src = window.location.origin + 
                '?url=' + encodeURIComponent(url) +
                '&ubofix=f41665f3028c7fd10eecf573336216d3';
            img.onload = onResponseReceived.bind(img, websocket, true);
            img.onerror = onResponseReceived.bind(img, websocket, false);
            return websocket;
        };

        WrappedWebSocket.prototype = RealWebSocket.prototype;
        window.WebSocket = WrappedWebSocket.bind(window);

        Object.defineProperties(window.WebSocket, {
            CONNECTING: { value: RealWebSocket.CONNECTING, enumerable: true },
            OPEN: { value: RealWebSocket.OPEN, enumerable: true },
            CLOSING: { value: RealWebSocket.CLOSING, enumerable: true },
            CLOSED: { value: RealWebSocket.CLOSED, enumerable: true },
            prototype: { value: RealWebSocket.prototype }
        });
    };

    scriptlets.push({
        scriptlet: scriptlet
    });
})();

/*******************************************************************************

    Instart Logic buster v1

    https://github.com/uBlockOrigin/uAssets/issues/227

**/

(function() {
    'use strict';

    if ( abort ) { return; }

    var scriptlet = function() {
        var magic = String.fromCharCode(Date.now() % 26 + 97) +
                    Math.floor(Math.random() * 982451653 + 982451653).toString(36);
        Object.defineProperty(window, 'I10C', {
            set: function() {
                throw new Error(magic);
            }
        });
        var oe = window.error;
        window.onerror = function(msg, src, line, col, error) {
            if ( msg.indexOf(magic) !== -1 ) {
                return true;
            }
            if ( oe instanceof Function ) {
                return oe(msg, src, line, col, error);
            }
        }.bind();
    };

    scriptlets.push({
        scriptlet: scriptlet,
        targets: [
            'baltimoresun.com',
            'boston.com',
            'capitalgazette.com',
            'carrollcountytimes.com',
            'celebuzz.com',
            'celebslam.com',
            'chicagotribune.com',
            'computershopper.com',
            'courant.com',
            'dailypress.com',
            'deathandtaxesmag.com',
            'extremetech.com',
            'gamerevolution.com',
            'geek.com',
            'gofugyourself.com',
            'hearthhead.com',
            'infinitiev.com',
            'lolking.net',
            'mcall.com',
            'nasdaq.com',
            'orlandosentinel.com',
            'pcmag.com',
            'ranker.com',
            'sandiegouniontribune.com',
            'saveur.com',
            'sherdog.com',
            'spin.com',
            'sporcle.com',
            'stereogum.com',
            'sun-sentinel.com',
            'thefrisky.com',
            'thesuperficial.com',
            'timeanddate.com',
            'tmn.today',
            'twincities.com',
            'vancouversun.com',
            'vibe.com',
            'weather.com',
            'wowhead.com',
        ]
    });
})();

/*******************************************************************************

    Instart Logic buster: v2

    https://github.com/uBlockOrigin/uAssets/issues/227#issuecomment-268409666

**/

(function() {
    'use strict';

    if ( abort ) { return; }

    var scriptlet = function() {
        var magic = String.fromCharCode(Date.now() % 26 + 97) +
                    Math.floor(Math.random() * 982451653 + 982451653).toString(36);
        window.I10C = new Proxy({}, {
            get: function(target, name) {
                switch ( name ) {
                case 'CanRun':
                    return function() {
                        return false;
                    };
                case 'HtmlStreaming':
                    return {
                        InsertTags: function(a, b) {
                            document.write(b); // jshint ignore:line
                        },
                        InterceptNode: function() {
                        },
                        PatchBegin: function() {
                        },
                        PatchEnd: function() {
                        },
                        PatchInit: function() {
                        },
                        ReloadWithNoHtmlStreaming: function() {
                        },
                        RemoveTags: function() {
                        },
                        UpdateAttributes: function() {
                        }
                    };
                default:
                    if ( target[name] === undefined ) {
                        throw new Error(magic);
                    }
                    return target[name];
                }
            },
            set: function(target, name, value) {
                switch ( name ) {
                case 'CanRun':
                    break;
                default:
                    target[name] = value;
                }
            }
        });
        window.INSTART = new Proxy({}, {
            get: function(target, name) {
                switch ( name ) {
                case 'Init':
                    return function() {
                    };
                default:
                    if ( target[name] === undefined ) {
                        throw new Error(magic);
                    }
                    return target[name];
                }
            },
            set: function(target, name, value) {
                switch ( name ) {
                case 'Init':
                    break;
                default:
                    target[name] = value;
                }
            }
        });
        var oe = window.error;
        window.onerror = function(msg, src, line, col, error) {
            if ( msg.indexOf(magic) !== -1 ) {
                return true;
            }
            if ( oe instanceof Function ) {
                return oe(msg, src, line, col, error);
            }
        }.bind();
    };

    scriptlets.push({
        scriptlet: scriptlet,
        targets: [
            'calgaryherald.com',
            'edmontonjournal.com',
            'edmunds.com',
            'financialpost.com',
            'leaderpost.com',
            'montrealgazette.com',
            'nationalpost.com',
            'ottawacitizen.com',
            'theprovince.com',
            'thestarphoenix.com',
            'windsorstar.com',
        ]
    });
})();

/*******************************************************************************

    WebRTC abuse: generic.

    https://github.com/uBlockOrigin/uAssets/issues/251

**/

(function() {
    'use strict';

    if ( abort ) { return; }

    // Nothing to fix for browsers not supporting RTCPeerConnection.
    if (
        window.RTCPeerConnection instanceof Function === false &&
        window.webkitRTCPeerConnection instanceof Function === false
    ) {
        return;
    }

    var scriptlet = function() {
        var RealRTCPeerConnection = window.RTCPeerConnection ||
                                    window.webkitRTCPeerConnection;
        var WrappedRTCPeerConnection = function(config) {
            if ( this instanceof WrappedRTCPeerConnection === false ) {
                return RealRTCPeerConnection();
            }
            var win = window, location = win.location, max = 10;
            try {
                for (;;) {
                    location = win.location;
                    if ( win.parent === win ) { break; }
                    win = win.parent;
                    if ( !win ) { break; }
                    if ( (max -= 1) === 0 ) { break; }
                }
            } catch(ex) {
            }
            var scheme = location.protocol === 'https:' ? 'wss' : 'ws',
                wsURL = scheme + '://' + location.hostname + '/';
            var rtcURL = config &&
                         config.iceServers &&
                         config.iceServers[0] &&
                         config.iceServers[0].urls &&
                         config.iceServers[0].urls;
            if ( Array.isArray(rtcURL) && rtcURL.length !== 0 ) {
                rtcURL = rtcURL[0];
            }
            if ( !rtcURL ) { rtcURL = ''; }
            try {
                (new window.WebSocket(wsURL)).close();
            } catch(ex) {
                var msg = ex.message.replace(wsURL, rtcURL)
                                    .replace('WebSocket', 'RTCPeerConnection');
                throw new Error(msg, '', 0);
            }
            if ( arguments.length === 0 ) {
                return new RealRTCPeerConnection();
            }
            return new RealRTCPeerConnection(config);
        };
        WrappedRTCPeerConnection.prototype = RealRTCPeerConnection.prototype;
        var bound = WrappedRTCPeerConnection.bind(window);
            bound.prototype = {
            createAnswer: RealRTCPeerConnection.prototype.createAnswer,
            createOffer: RealRTCPeerConnection.prototype.createOffer,
            generateCertificate: RealRTCPeerConnection.prototype.generateCertificate,
        };
        if ( window.RTCPeerConnection instanceof Function ) {
            window.RTCPeerConnection = bound;
        }
        if ( window.webkitRTCPeerConnection instanceof Function ) {
            window.webkitRTCPeerConnection = bound;
        }
    };

    scriptlets.push({
        scriptlet: scriptlet,
        exceptions: [
            'hangouts.google.com',
            'meet.google.com',
        ],
    });
})();

/*******************************************************************************

    Collate and add scriptlets to document.

**/

(function() {
    'use strict';

    if ( scriptlets.length === 0 ) { return; }

    var restrFromString = function(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    var reFromArray = function(aa) {
        return new RegExp('(^|\.)(' + aa.map(restrFromString).join('|') + ')$');
    };

    var scriptText = [], entry, re;

    while ( (entry = scriptlets.shift()) ) {
        if ( Array.isArray(entry.targets) ) {
            re = reFromArray(entry.targets);
            if ( re.test(hostname) === false ) { continue; }
        } else if ( Array.isArray(entry.exceptions) ) {
            re = reFromArray(entry.exceptions);
            if ( re.test(hostname) ) { continue; }
        }
        scriptText.push('(' + entry.scriptlet.toString() + ')();');
    }

    if ( scriptText.length === 0 ) { return; }

    // Have the script tag remove itself once executed (leave a clean
    // DOM behind).
    var cleanup = function() {
        var c = document.currentScript, p = c && c.parentNode;
        if ( p ) {
            p.removeChild(c);
        }
    };
    scriptText.push('(' + cleanup.toString() + ')();');

    var elem = document.createElement('script');
    elem.appendChild(document.createTextNode(scriptText.join('\n')));
    try {
        (document.head || document.documentElement).appendChild(elem);
    } catch(ex) {
    }
})();
