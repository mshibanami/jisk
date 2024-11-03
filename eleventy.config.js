module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addWatchTarget("src/");
  eleventyConfig.configureErrorReporting({ allowMissingExtensions: true });

  if (process.env.ELEVENTY_ENV === "production") {
    eleventyConfig.addGlobalData("baseUrl", "https://mshibanami.github.io/jisk/");
  }

  eleventyConfig.addGlobalData("permalink", () => {
    return (data) =>
      `${data.page.filePathStem}.${data.page.outputFileExtension}`;
  });
  eleventyConfig.addUrlTransform((page) => {
    if (page.url.endsWith(".html")) {
      return page.url.slice(0, -1 * ".html".length);
    }
  });

  return {
    dir: {
      input: "src",
      output: "out"
    }
  };
};
