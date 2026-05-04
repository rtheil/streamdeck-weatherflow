import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import path from "node:path";
import url from "node:url";

const isWatching = !!process.env.ROLLUP_WATCH;
const sdPlugin = "com.ricky.weatherflow.sdPlugin";

export default {
  input: "src/plugin.ts",
  output: {
    file: `${sdPlugin}/bin/plugin.js`,
    sourcemap: isWatching,
    sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
      return url.pathToFileURL(
        path.resolve(path.dirname(sourcemapPath), relativeSourcePath)
      ).href;
    },
  },
  plugins: [
    {
      name: "watch-externals",
      buildStart() {
        if (isWatching) {
          this.addWatchFile(`${sdPlugin}/manifest.json`);
        }
      },
    },
    typescript({
      compilerOptions: { sourceMap: isWatching },
      mapRoot: isWatching ? "./" : undefined,
    }),
    nodeResolve({ exportConditions: ["node"] }),
    commonjs(),
    !isWatching && terser(),
  ].filter(Boolean),
};
