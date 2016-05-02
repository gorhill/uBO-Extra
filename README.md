# uBO-WebSocket
A companion extension for Chromium-based browsers to expose websocket connections to [uBlock Origin](https://github.com/gorhill/uBlock).

### Purpose

For Chromium-based browsers, WebSocket connections are not available to the [chrome.webRequest API](https://developer.chrome.com/extensions/webRequest). This companion extension (it's pointless to use it as a standalone) will enable uBlock Origin to become aware of WebSocket connection attempts.

Related: [Chromium issue 129353](https://bugs.chromium.org/p/chromium/issues/detail?id=129353).

In fact, any extension which listens to network request through the chrome.webRequest API can gain the ability to see and act on WebSocket connections with this companion extensions.

Currently works known to work with uBlock Origin 1.7.2 and above.
