const path = require("path");
const HtmlPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const git = require("git-rev-sync");
// const ImageminPlugin = require("imagemin-webpack-plugin").default;

module.exports = {
  // //context directory is src
  // context: path.join(__dirname, "src"),

  //entry file of the project,(relative to context)
  entry: "./src/game.ts",
  output: {
    //distribution directory
    path: path.resolve(__dirname, "dist"),

    /**
     * webpack will import the file for the index.html automatically,though the js file does not exist on disk.
     * the js file will generated after webpack build the project, and the js will inserted at index.html automatically.
     * [hash:8] means unique 8 digit hash generated everytime.
     **/
    filename: "game.[hash:8].js",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: { allowTsInNodeModules: true },
        },
        // exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },

  plugins: [
    new CleanWebpackPlugin(),

    //copy all src/assets to dist/assets
    new CopyWebpackPlugin({
      patterns: [
        // Copy Booyah assets
        {
          from: path.resolve(
            require.resolve("booyah/package.json"),
            "../images"
          ),
          to: "booyah/images",
        },
        {
          from: path.resolve(
            require.resolve("booyah/package.json"),
            "../fonts"
          ),
          to: "booyah/fonts",
        },

        // Copy CSS
        { from: "*.css" },

        // Copy game assets
        {
          from: "images",
          to: "images",
        },
        {
          from: "fonts",
          to: "fonts",
        },
        {
          from: "audio",
          to: "audio",
        },
        {
          from: "video",
          to: "video",
        },
        {
          from: "text",
          to: "text",
        },
      ],
    }),
    // //opimize all image file
    // new ImageminPlugin({
    //   test: /\.(jpe?g|png|gif|svg)$/i,
    //   // optipng: {
    //   //   optimizationLevel: 4
    //   // },
    //   //this way seems better on mac.
    //   pngquant: {
    //     verbose: true,
    //     quality: "80-90",
    //   },
    // }),

    //copy html to dist and insert the js reference.
    new HtmlPlugin({
      filename: path.join(__dirname, "dist", "index.html"),
      template: "./index.html",
      templateParameters: {
        date: new Date(),
        commit: git.short(),
        branch: git.branch(),
      },
    }),

    // Copy "embed" version
    new HtmlPlugin({
      filename: path.join(__dirname, "dist", "embed.html"),
      template: "./embed.html",
      templateParameters: {
        date: new Date(),
        commit: git.short(),
        branch: git.branch(),
      },
    }),
  ],
};
