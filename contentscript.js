/*******************************************************************************

    uBO-WebSocket - a companion browser extension to reveal
    WebSocket connection attempts to uBlock origin.
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

/******************************************************************************/

(function() {

'use strict';

/******************************************************************************/

var doc = document;

// https://github.com/chrisaljoudi/uBlock/issues/464
if ( doc instanceof HTMLDocument === false ) {
    // https://github.com/chrisaljoudi/uBlock/issues/1528
    // A XMLDocument can be a valid HTML document.
    if (
        doc instanceof XMLDocument === false ||
        doc.createElement('div') instanceof HTMLDivElement === false
    ) {
        return false;
    }
}

// https://github.com/gorhill/uBlock/issues/1124
// Looks like `contentType` is on track to be standardized:
//   https://dom.spec.whatwg.org/#concept-document-content-type
if ( (doc.contentType || '').lastIndexOf('image/', 0) === 0 ) {
    return false; 
}

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

// Only for http/https documents.
if ( /^https?:/.test(window.location.protocol) !== true ) {
    return false;
}

var parent = doc.head || doc.documentElement;
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
var script = doc.createElement('script');
script.textContent = "\
(function() {                                                            \n\
    'use strict';                                                        \n\
    var Wrapped = window.WebSocket;                                      \n\
    var toWrapped = new WeakMap();                                       \n\
    var onResponseReceived = function(wrapper, ok) {                     \n\
        this.onload = this.onerror = null;                               \n\
        var bag = toWrapped.get(wrapper);                                \n\
        if ( !ok ) {                                                     \n\
            if ( bag.properties.onerror ) {                              \n\
                bag.properties.onerror(new window.ErrorEvent('error'));  \n\
            }                                                            \n\
            return;                                                      \n\
        }                                                                \n\
        var wrapped = null;                                              \n\
        try {                                                            \n\
            wrapped = new Wrapped(bag.args.url, bag.args.protocols);     \n\
        } catch (ex) {                                                   \n\
            console.error(ex);                                           \n\
        }                                                                \n\
        if ( wrapped === null ) {                                        \n\
            return;                                                      \n\
        }                                                                \n\
        for ( var p in bag.properties ) {                                \n\
            wrapped[p] = bag.properties[p];                              \n\
        }                                                                \n\
        for ( var i = 0, l; i < bag.listeners.length; i++ ) {            \n\
            l = bag.listeners[i];                                        \n\
            wrapped.addEventListener(l.ev, l.cb, l.fl);                  \n\
        }                                                                \n\
        toWrapped.set(wrapper, wrapped);                                 \n\
    };                                                                   \n\
    var noopfn = function() {};                                          \n\
    var fallthruGet = function(wrapper, prop, value) {                   \n\
        var wrapped = toWrapped.get(wrapper);                            \n\
        if ( !wrapped ) {                                                \n\
            return value;                                                \n\
        }                                                                \n\
        if ( wrapped instanceof Wrapped ) {                              \n\
            return wrapped[prop];                                        \n\
        }                                                                \n\
        return wrapped.properties.hasOwnProperty(prop) ?                 \n\
            wrapped.properties[prop] :                                   \n\
            value;                                                       \n\
    };                                                                   \n\
    var fallthruSet = function(wrapper, prop, value) {                   \n\
        if ( value instanceof Function ) {                               \n\
            value = value.bind(wrapper);                                 \n\
        }                                                                \n\
        var wrapped = toWrapped.get(wrapper);                            \n\
        if ( !wrapped ) {                                                \n\
            return;                                                      \n\
        }                                                                \n\
        if ( wrapped instanceof Wrapped ) {                              \n\
            wrapped[prop] = value;                                       \n\
        } else {                                                         \n\
            wrapped.properties[prop] = value;                            \n\
        }                                                                \n\
    };                                                                   \n\
    var WebSocket = function(url, protocols) {                           \n\
        'native';                                                        \n\
        if (                                                             \n\
            window.location.protocol === 'https:' &&                     \n\
            url.lastIndexOf('ws:', 0) === 0                              \n\
        ) {                                                              \n\
            var ws = new Wrapped(url, protocols);                        \n\
            if ( ws ) {                                                  \n\
                ws.close();                                              \n\
            }                                                            \n\
        }                                                                \n\
        Object.defineProperties(this, {                                  \n\
            'binaryType': {                                              \n\
                get: function() {                                        \n\
                    return fallthruGet(this, 'binaryType', '');          \n\
                },                                                       \n\
                set: function(value) {                                   \n\
                    fallthruSet(this, 'binaryType', value);              \n\
                }                                                        \n\
            },                                                           \n\
            'bufferedAmount': {                                          \n\
                get: function() {                                        \n\
                    return fallthruGet(this, 'bufferedAmount', 0);       \n\
                },                                                       \n\
                set: noopfn                                              \n\
            },                                                           \n\
            'extensions': {                                              \n\
                get: function() {                                        \n\
                    return fallthruGet(this, 'extensions', '');          \n\
                },                                                       \n\
                set: noopfn                                              \n\
            },                                                           \n\
            'onclose': {                                                 \n\
                get: function() {                                        \n\
                    return fallthruGet(this, 'onclose', null);           \n\
                },                                                       \n\
                set: function(value) {                                   \n\
                    fallthruSet(this, 'onclose', value);                 \n\
                }                                                        \n\
            },                                                           \n\
            'onerror': {                                                 \n\
                get: function() {                                        \n\
                    return fallthruGet(this, 'onerror', null);           \n\
                },                                                       \n\
                set: function(value) {                                   \n\
                    fallthruSet(this, 'onerror', value);                 \n\
                }                                                        \n\
            },                                                           \n\
            'onmessage': {                                               \n\
                get: function() {                                        \n\
                    return fallthruGet(this, 'onmessage', null);         \n\
                },                                                       \n\
                set: function(value) {                                   \n\
                    fallthruSet(this, 'onmessage', value);               \n\
                }                                                        \n\
            },                                                           \n\
            'onopen': {                                                  \n\
                get: function() {                                        \n\
                    return fallthruGet(this, 'onopen', null);            \n\
                },                                                       \n\
                set: function(value) {                                   \n\
                    fallthruSet(this, 'onopen', value);                  \n\
                }                                                        \n\
            },                                                           \n\
            'protocol': {                                                \n\
                get: function() {                                        \n\
                    return fallthruGet(this, 'protocol', '');            \n\
                },                                                       \n\
                set: noopfn                                              \n\
            },                                                           \n\
            'readyState': {                                              \n\
                get: function() {                                        \n\
                    return fallthruGet(this, 'readyState', 0);           \n\
                },                                                       \n\
                set: noopfn                                              \n\
            },                                                           \n\
            'url': {                                                     \n\
                get: function() {                                        \n\
                    return fallthruGet(this, 'url', '');                 \n\
                },                                                       \n\
                set: noopfn                                              \n\
            }                                                            \n\
        });                                                              \n\
        toWrapped.set(this, {                                            \n\
            args: { url: url, protocols: protocols },                    \n\
            listeners: [],                                               \n\
            properties: {}                                               \n\
        });                                                              \n\
        var img = new Image();                                           \n\
        img.src =                                                        \n\
              window.location.origin                                     \n\
            + '?url=' + encodeURIComponent(url)                          \n\
            + '&ubofix=f41665f3028c7fd10eecf573336216d3';                \n\
        img.onload = onResponseReceived.bind(img, this, true);           \n\
        img.onerror = onResponseReceived.bind(img, this, false);         \n\
    };                                                                   \n\
    WebSocket.prototype = Object.create(window.EventTarget.prototype, {  \n\
        CONNECTING: { value: 0 },                                        \n\
        OPEN: { value: 1 },                                              \n\
        CLOSING: { value: 2 },                                           \n\
        CLOSED: { value: 3 },                                            \n\
        addEventListener: {                                              \n\
            enumerable: true,                                            \n\
            value: function(ev, cb, fl) {                                \n\
                if ( cb instanceof Function === false ) {                \n\
                    return;                                              \n\
                }                                                        \n\
                var wrapped = toWrapped.get(this);                       \n\
                if ( !wrapped ) {                                        \n\
                    return;                                              \n\
                }                                                        \n\
                var cbb = cb.bind(this);                                 \n\
                if ( wrapped instanceof Wrapped ) {                      \n\
                    wrapped.addEventListener(ev, cbb, fl);               \n\
                } else {                                                 \n\
                    wrapped.listeners.push({ ev: ev, cb: cbb, fl: fl }); \n\
                }                                                        \n\
            },                                                           \n\
            writable: true                                               \n\
        },                                                               \n\
        close: {                                                         \n\
            enumerable: true,                                            \n\
            value: function(code, reason) {                              \n\
               'native';                                                 \n\
                var wrapped = toWrapped.get(this);                       \n\
                if ( wrapped instanceof Wrapped ) {                      \n\
                    wrapped.close(code, reason);                         \n\
                }                                                        \n\
            },                                                           \n\
            writable: true                                               \n\
        },                                                               \n\
        removeEventListener: {                                           \n\
            enumerable: true,                                            \n\
            value: function(ev, cb, fl) {                                \n\
            },                                                           \n\
            writable: true                                               \n\
        },                                                               \n\
        send: {                                                          \n\
            enumerable: true,                                            \n\
            value: function(data) {                                      \n\
                'native';                                                \n\
                var wrapped = toWrapped.get(this);                       \n\
                if ( wrapped instanceof Wrapped ) {                      \n\
                    wrapped.send(data);                                  \n\
                }                                                        \n\
            },                                                           \n\
            writable: true                                               \n\
        }                                                                \n\
    });                                                                  \n\
    WebSocket.CONNECTING = 0;                                            \n\
    WebSocket.OPEN = 1;                                                  \n\
    WebSocket.CLOSING = 2;                                               \n\
    WebSocket.CLOSED = 3;                                                \n\
    window.WebSocket = WebSocket;                                        \n\
    var me = document.currentScript;                                     \n\
    if ( me && me.parentNode !== null ) {                                \n\
        me.parentNode.removeChild(me);                                   \n\
    }                                                                    \n\
})();";

try {
    parent.appendChild(script);
} catch (ex) {
}

return true;

/******************************************************************************/

})();
