const path = require("path");
const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  configureWebpack: (config) => {
    const resolve = {
      alias: {
        "@": path.join(__dirname, "src"),
      },
    };
    const obj = {
      resolve,
    };

    return obj;
  },
});
