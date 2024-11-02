module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addWatchTarget("src/");
  eleventyConfig.configureErrorReporting({ allowMissingExtensions: true });

  // FIXME: According to the following documentation, this should work, but it doesn't:
  // https://www.11ty.dev/docs/permalinks/#remove-trailing-slashes
  // For now, I set `permalink` in the front matter of each pages.
  // eleventyConfig.addGlobalData("permalink", () => {
  //     return (data) =>
  //         `${data.page.filePathStem}.${data.page.outputFileExtension}`;
  // });
  // eleventyConfig.addUrlTransform((page) => {
  //     if (page.url.endsWith(".html")) {
  //         return page.url.slice(0, -1 * ".html".length);
  //     }
  // });

  return {
    dir: {
      input: "src",
      output: "out"
    }
  };
};
