module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addWatchTarget("src/");
  eleventyConfig.configureErrorReporting({ allowMissingExtensions: true });

  switch (process.env.ELEVENTY_ENV) {
    case "GITHUB":
      eleventyConfig.addGlobalData("baseUrl", "https://mshibanami.github.io/jisk/");
    case "CODEBERG":
      eleventyConfig.addGlobalData("baseUrl", "https://mshibanami.codeberg.page/jisk/");
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
