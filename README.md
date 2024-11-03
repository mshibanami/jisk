# jisk

[![Deploy](https://github.com/mshibanami/jisk/actions/workflows/deploy.yml/badge.svg)](https://github.com/mshibanami/jisk/actions/workflows/deploy.yml) [![Tests](https://github.com/mshibanami/jisk/actions/workflows/tests.yaml/badge.svg)](https://github.com/mshibanami/jisk/actions/workflows/tests.yaml)

<https://mshibanami.github.io/jisk>

This is a web tool that helps you jump from a specific web service to an alternative front end, such as Redlib, Invidious, and so on. Those alternative web services are served by multiple instances, and this tool automatically selects one of the available ones.

This is especially useful to combine with a browser extension where you can automatically set up arbitrary redirect rules, such as:

- Safari (iOS & macOS)
    - [Redirect Web for Safari](https://apps.apple.com/au/app/redirect-web-for-safari/id1571283503) by me! 😄
- Firefox
    - [Redirector](https://addons.mozilla.org/en-US/firefox/addon/redirector/) by Einar Egilsson
- Google Chrome
    - [Redirector](https://chromewebstore.google.com/detail/redirector/ocgpenflpmgnfapjedencafcfakcekcd) by Einar Egilsson

## Example

Let's say you want to redirect from Reddit to Redlib.

Firstly, open the following URL and follow the instructions displayed:

<https://mshibanami.github.io/jisk>

Then you'll get the redirection URL like this:

```url
https://mshibanami.github.io/jisk/redlib?url=...
```

And then, using your your browser extension, set up a redirect rule that redirects from the original Reddit URL to `mshibanami.github.io/jisk/redlib?url=...`.

## How does it work?

When you open the web page, it checks the available instances of the alternative web service and redirects you to the one that is available.

The instance is randomly picked from the available instances.

The instance list is embedded in the web page and refreshed everyday by GitHub Actions.

## Query Parameters

You can specify the following query parameters for the redirection URL for each service:

- `url`: The source URL you want to redirect to the alternative web service. This should be URL-encoded.
- `cache_expiry`: The cache expiry time in seconds. The default is 86400 seconds (1 day). If you set it to `0`, the cache will not be used.
- `auto_redirect`: If `false`, the page will not redirect automatically. It's also useful to debug the redirection. The default is `true`.
- `countries`: A comma-separated list of country codes. If you specify this parameter, the redirection will be limited to the specified countries. The default is no limitation.

## Privacy Policy

This tool does not collect any personal information. No analytics or tracking is used.

You can also host this tool by forking this repository and use it as your own.

## License

This tool is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

## Contributing

See [the contributing guide](CONTRIBUTING.md) for detailed instructions on how to get started with our project.

## Acknowledgments

I appreciate [@atutal](https://github.com/atutal) who gave me an inspiration to create this project [here](https://github.com/mshibanami/redirect-web/issues/61).
