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

var scriptlets = [];

/*******************************************************************************

    Don't run on non-HTML documents.

**/

var isNotHTML = (function() {
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

    Websocket abuse buster.

    https://github.com/gorhill/uBlock/issues/1936

**/

(function() {
    'use strict';

    if ( isNotHTML ) { return; }

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
    // Ideally, the `js/websocket.js` script would be declared as a
    // `web_accessible_resources` in the manifest, but this unfortunately would
    // open the door for web pages to identify *directly* that one is using
    // uBlock Origin. Consequently, I have to inject the code as a literal
    // string below :(
    // For code review, the stringified code below is found in
    // `js/websocket.js` (comments and empty lines were stripped).
    var scriptlet = function() {
        var Wrapped = window.WebSocket;
        var toWrapped = new WeakMap();
        var onResponseReceived = function(wrapper, ok) {
            this.onload = this.onerror = null;
            var bag = toWrapped.get(wrapper);
            if ( !ok ) {
                if ( bag.properties.onerror ) {
                    bag.properties.onerror(new window.ErrorEvent('error'));
                }
                return;
            }
            var wrapped = null;
            try {
                wrapped = new Wrapped(bag.args.url, bag.args.protocols);
            } catch (ex) {
                console.error(ex.toString());
            }
            if ( wrapped === null ) {
                return;
            }
            for ( var p in bag.properties ) {
                wrapped[p] = bag.properties[p];
            }
            for ( var i = 0, l; i < bag.listeners.length; i++ ) {
                l = bag.listeners[i];
                wrapped.addEventListener(l.ev, l.cb, l.fl);
            }
            Object.getPrototypeOf(wrapped).constructor = window.WebSocket;
            toWrapped.set(wrapper, wrapped);
        };
        var noopfn = function() {};
        var fallthruGet = function(wrapper, prop, value) {
            var wrapped = toWrapped.get(wrapper);
            if ( !wrapped ) {
                return value;
            }
            if ( wrapped instanceof Wrapped ) {
                return wrapped[prop];
            }
            return wrapped.properties.hasOwnProperty(prop) ?
                wrapped.properties[prop] :
                value;
        };
        var fallthruSet = function(wrapper, prop, value) {
            if ( value instanceof Function ) {
                value = value.bind(wrapper);
            }
            var wrapped = toWrapped.get(wrapper);
            if ( !wrapped ) {
                return;
            }
            if ( wrapped instanceof Wrapped ) {
                wrapped[prop] = value;
            } else {
                wrapped.properties[prop] = value;
            }
        };
        var WebSocket = function(url, protocols) {
            'native';
            if (
                window.location.protocol === 'https:' &&
                url.lastIndexOf('ws:', 0) === 0
            ) {
                var ws = new Wrapped(url, protocols);
                if ( ws ) {
                    ws.close();
                }
            }
            Object.defineProperties(this, {
                'binaryType': {
                    get: function() {
                        return fallthruGet(this, 'binaryType', 'blob');
                    },
                    set: function(value) {
                        fallthruSet(this, 'binaryType', value);
                    }
                },
                'bufferedAmount': {
                    get: function() {
                        return fallthruGet(this, 'bufferedAmount', 0);
                    },
                    set: noopfn
                },
                'extensions': {
                    get: function() {
                        return fallthruGet(this, 'extensions', '');
                    },
                    set: noopfn
                },
                'onclose': {
                    get: function() {
                        return fallthruGet(this, 'onclose', null);
                    },
                    set: function(value) {
                        fallthruSet(this, 'onclose', value);
                    }
                },
                'onerror': {
                    get: function() {
                        return fallthruGet(this, 'onerror', null);
                    },
                    set: function(value) {
                        fallthruSet(this, 'onerror', value);
                    }
                },
                'onmessage': {
                    get: function() {
                        return fallthruGet(this, 'onmessage', null);
                    },
                    set: function(value) {
                        fallthruSet(this, 'onmessage', value);
                    }
                },
                'onopen': {
                    get: function() {
                        return fallthruGet(this, 'onopen', null);
                    },
                    set: function(value) {
                        fallthruSet(this, 'onopen', value);
                    }
                },
                'protocol': {
                    get: function() {
                        return fallthruGet(this, 'protocol', '');
                    },
                    set: noopfn
                },
                'readyState': {
                    get: function() {
                        return fallthruGet(this, 'readyState', 0);
                    },
                    set: noopfn
                },
                'url': {
                    get: function() {
                        return fallthruGet(this, 'url', '');
                    },
                    set: noopfn
                }
            });
            toWrapped.set(this, {
                args: { url: url, protocols: protocols },
                listeners: [],
                properties: {}
            });
            var img = new Image();
            img.src = window.location.origin + 
                '?url=' + encodeURIComponent(url) +
                '&ubofix=f41665f3028c7fd10eecf573336216d3';
            img.onload = onResponseReceived.bind(img, this, true);
            img.onerror = onResponseReceived.bind(img, this, false);
        };
        WebSocket.prototype = Object.create(window.EventTarget.prototype, {
            CONNECTING: { value: 0 },
            OPEN: { value: 1 },
            CLOSING: { value: 2 },
            CLOSED: { value: 3 },
            addEventListener: {
                enumerable: true,
                value: function(ev, cb, fl) {
                    if ( cb instanceof Function === false ) {
                        return;
                    }
                    var wrapped = toWrapped.get(this);
                    if ( !wrapped ) {
                        return;
                    }
                    var cbb = cb.bind(this);
                    if ( wrapped instanceof Wrapped ) {
                        wrapped.addEventListener(ev, cbb, fl);
                    } else {
                        wrapped.listeners.push({ ev: ev, cb: cbb, fl: fl });
                    }
                },
                writable: true
            },
            close: {
                enumerable: true,
                value: function(code, reason) {
                   'native';
                    var wrapped = toWrapped.get(this);
                    if ( wrapped instanceof Wrapped ) {
                        wrapped.close(code, reason);
                    }
                },
                writable: true
            },
            removeEventListener: {
                enumerable: true,
                value: function(ev, cb, fl) {
                },
                writable: true
            },
            send: {
                enumerable: true,
                value: function(data) {
                    'native';
                    var wrapped = toWrapped.get(this);
                    if ( wrapped instanceof Wrapped ) {
                        wrapped.send(data);
                    }
                },
                writable: true
            }
        });
        WebSocket.CONNECTING = 0;
        WebSocket.OPEN = 1;
        WebSocket.CLOSING = 2;
        WebSocket.CLOSED = 3;
        window.WebSocket = WebSocket;
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

    if ( isNotHTML ) { return; }

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
            'boston.com',
            'chicagotribune.com',
            'mcall.com',
            'orlandosentinel.com',
            'sandiegouniontribune.com',
            'sporcle.com',
            'sun-sentinel.com',
            'timeanddate.com',
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

    if ( isNotHTML ) { return; }

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
                            document.write(b);
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
            'leaderpost.com',
            'montrealgazette.com',
            'ottawacitizen.com',
            'theprovince.com',
            'thestarphoenix.com',
            'windsorstar.com',
        ]
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
            if ( re.test( window.location.hostname) === false ) {
                continue;
            }
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
