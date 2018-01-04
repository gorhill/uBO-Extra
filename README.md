# uBO-Extra

A companion extension to [uBlock Origin](https://github.com/gorhill/uBlock): to gain ability to foil early anti-user mechanisms working around content blockers or even a browser privacy settings.

The extension is useful only for Chromium-based browsers. There is no need for such an extension so far on Firefox, and thus there is no version for Firefox.

See ["Sites on which uBO-Extra is useful"](https://github.com/gorhill/uBO-Extra/wiki/Sites-on-which-uBO-Extra-is-useful).

### Installation

Manually, using your browser's _"Load unpacked extension..."_ feature:
- Download latest version (.zip) from [_Releases_](https://github.com/gorhill/uBO-Extra/releases).
- Go to _Extensions_, check _"Developer mode"_.
- Click _"Load unpacked extension..."_, select the zip file you downloaded above.
- Keep in mind you will have to update manually when a new version is released.

From the Chrome store:
- <https://chrome.google.com/webstore/detail/ublock-origin-extra/pgdnlhfefecpicbbihgmbmffkjpaplco>.
- New version will be updated automatically.

### Purpose

To foil hostile anti-user mechanisms used to work around content blockers or even privacy settings in a browser.

***

For browsers based on Chromium 57 and below, WebSocket connections are not available to the [chrome.webRequest API](https://developer.chrome.com/extensions/webRequest). This companion extension (it's pointless to use it as a standalone) will allow uBlock Origin to become aware of WebSocket connection attempts: they can be filtered, and will be reported in the logger.

Related issues:

- <https://github.com/gorhill/uBlock/issues/1936>
- <https://bugs.chromium.org/p/chromium/issues/detail?id=129353>

***

Instart Logic's technology used to disguise third-party network requests as first-party network requests, **including** the writing/reading of third-party cookies as first-party cookies. I consider this to be extremely hostile to users, even those **not** using a content blocker, as it allows third-party servers to read/write cookies even if a user chose to block 3rd-party cookies through your browser setting.

The company behind the technology understands how hostile its technology is to users, and thus tries to hide what is being done by making it difficult to investigate by detecting whether the browser's developer console is opened, and when it detects it is opened, it ceases completely to make use of the obfuscation mechanism. The developer console-detecting code works only for Chromium-based browsers however, and therefore the obfuscation technology is not used when using Firefox (a different web page is served for Firefox).

Related issues:

- <https://github.com/uBlockOrigin/uAssets/issues/227>
- <https://www.reddit.com/r/wow/comments/5exq2d/wowheadcom_sucking_bandwidth/>

Further reading:

- ["Revealed: The naughty tricks used by web ads to bypass blockers"](https://www.theregister.co.uk/2017/08/11/ad_blocker_bypass_code/) (The Register)

***

The extension has no interactive UI, just an icon in the toolbar to remind it's enabled.

Your browser should allow you to hide the icon if it annoys you. Use uBlock Origin's logger if you want to see and possibly filter WebSocket connections made visible by uBO-Extra.
