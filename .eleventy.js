module.exports = function (eleventyConfig) {
    eleventyConfig.addPassthroughCopy("src/assets");
    eleventyConfig.addWatchTarget("src/");
    return {
        dir: {
            input: "src",
            output: "out"
        }
    };
};
