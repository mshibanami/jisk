# jisk

[![Deploy](https://github.com/mshibanami/jisk/actions/workflows/deploy.yml/badge.svg)](https://github.com/mshibanami/jisk/actions/workflows/deploy.yml) [![Tests](https://github.com/mshibanami/jisk/actions/workflows/tests.yaml/badge.svg)](https://github.com/mshibanami/jisk/actions/workflows/tests.yaml)

- <https://mshibanami.github.io/jisk/> or
- <https://mshibanami.codeberg.page/jisk/>

This is a web tool that helps you jump from a specific web service to an alternative front-end, such as Redlib, Invidious, and so on. These alternative web services are provided by multiple instances, and this tool automatically selects one of the available ones.

This is especially useful when combined with a browser extension that allows you to automatically set up arbitrary redirect rules, such as:

- Safari: [Redirect Web for Safari](https://apps.apple.com/app/redirect-web-for-safari/id1571283503)
- Firefox: [Redirector](https://addons.mozilla.org/en-US/firefox/addon/redirector/)
- Google Chrome: [Redirector](https://chrome.google.com/webstore/detail/redirector/ocgpenflpmgnfapjedencafcfakcekcd)

Or you can use a user script manager such as [Tampermonkey](https://www.tampermonkey.net), [Greasemonkey](https://www.greasespot.net), [Violentmonkey](https://violentmonkey.github.io), etc.

## Example

Let's say you want to redirect from Reddit to Redlib.

First, open the following URL and follow the instructions displayed:

<https://mshibanami.github.io/jisk>

Then you'll get a redirection URL like this:

```url
https://mshibanami.github.io/jisk/redlib?url=...
```

Then, using your browser extension, set up a redirect rule that redirects from the original Reddit URL to `https://mshibanami.github.io/jisk/redlib?url=...`.

## How does it work?

When you open the web page, it checks the available instances of the alternative web service and redirects you to one of them.

The instance is randomly picked from the available instances.

The instance list is embedded in the web page and refreshed every day by GitHub Actions.

## Query Parameters

You can specify the following query parameters for the redirection URL for each service:

- `url`: The source URL you want to redirect to the alternative web service. This should be URL-encoded.
- `cache_expiry`: The cache expiry time in seconds. The default is 86,400 seconds (1 day). If you set it to `0`, caching will be disabled.
- `auto_redirect`: If `false`, the page will not redirect automatically. This is also useful for debugging redirection. The default is `true`.
- `countries`: A comma-separated list of country codes. If you specify this parameter, the redirection will be limited to the specified countries. The default is no limitation.
- `preferred_instances`: A comma-separated list of the host name (e.g. `example.com`) of the preferred instances. The specified instances will be prioritized to check availability.

## Q&A

### Why not LibRedirect?

[LibRedirect](https://libredirect.github.io) is not available on all platforms, such as Safari. jisk is a workaround for such platforms. Originally, jisk was made to handle the need of auto-selecting instances using [Redirect Web](https://apps.apple.com/app/redirect-web-for-safari/id1571283503), as discussed [here](https://github.com/mshibanami/redirect-web/issues/61).

Also, jisk provides some unique features, such as filtering by countries. So, it's not necessarily just a workaround for LibRedirect.

However, LibRedirect provides a more seamless experience as it doesn't display the "Redirecting..." page. So, whether to use jisk or LibRedirect depends on your preference.

## Privacy Policy

jisk does not collect any personal information. This tool is just a static website without analytics or tracking.

## License

This tool is licensed under the MIT License — see the [LICENSE.txt](LICENSE.txt) file for details.

## Contributing

See [the contributing guide](CONTRIBUTING.md) for detailed instructions on how to get started with our project.

## Acknowledgments

I appreciate [@atutal](https://github.com/atutal), who inspired me to create this project [here](https://github.com/mshibanami/redirect-web/issues/61).
