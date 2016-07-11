# uBO-WebSocket
A companion extension for Chromium-based browsers to expose websocket connections to [uBlock Origin](https://github.com/gorhill/uBlock).

### Installation

You can install manually using your browser's _"Load unpacked extension..."_ feature, or directly from the Chrome store: <https://chrome.google.com/webstore/detail/ublock-origin-websocket/pgdnlhfefecpicbbihgmbmffkjpaplco>.

### Purpose

For Chromium-based browsers, WebSocket connections are not available to the [chrome.webRequest API](https://developer.chrome.com/extensions/webRequest). This companion extension (it's pointless to use it as a standalone) will allow uBlock Origin to become aware of WebSocket connection attempts: they can be filtered, and will be reported in the logger.

Related: [Chromium issue 129353](https://bugs.chromium.org/p/chromium/issues/detail?id=129353).

In fact, any extension which listens to network request through the chrome.webRequest API can gain the ability to see and act on WebSocket connections with this companion extensions.

Currently known to work with uBlock Origin 1.7.2 and above.

The extension has no interactive UI, just an icon in the toolbar to remind it's enabled. Your browser should allow you to hide the icon if it annoys you. Use uBlock Origin's logger if you want to see and possibly filter WebSocket connections.

### Sites benefitting from WebSocket filtering

I will add as I stumble on cases (feel free to add to the list through a pull request -- alphabetical order by domain name).

- `opensubtitles.org` ([ref](https://forums.lanik.us/viewtopic.php?f=62&t=29304))
- `thewatchseries.to` ([ref](https://forums.lanik.us/viewtopic.php?f=62&t=30068))
- adult sites ([ref](https://github.com/easylist/easylist/commit/61dfc7d8be32a7cb17c9ff75d3849f3c6ce77557), [ref](https://adblockplus.org/forum/viewtopic.php?f=1&t=46004))
