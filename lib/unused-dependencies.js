const detective = require('detective-module');
const filesMatchingGlob = require('glob');
const fs = require('fs');
const promiseEachConcurrency = require('promise-each-concurrency');
const _ = require('lodash');

// use node-detective-module and support require() as well

function readFile(pathToFile) {
  return new Promise((resolve, reject) => {
    fs.readFile(pathToFile, 'utf8', (err, file) => {
      if (err) { reject(err); } else { resolve(file); }
    });
  });
}

function getJsFiles(glob) {
  return new Promise((resolve, reject) => {
    filesMatchingGlob(glob, { ignore: '**/node_modules/**' }, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
}

function getPackageJSON(packageJsonPath) {
  return readFile(packageJsonPath)
    .then(JSON.parse.bind(JSON));
}

module.exports = function unusedDependencies({ packageJsonPath, glob }) {
  return Promise.all([
    getJsFiles(glob).then(files => {
      const dependencies = [];
      return promiseEachConcurrency(files, file =>
        readFile(file)
          .then(contents => {
            dependencies.push(...detective(contents).map(x => x.name));
          })
      ).then(() => dependencies);
    }),
    getPackageJSON(packageJsonPath).then(x =>
      ({
        dependencies: Object.keys(x.dependencies || {}),
        devDependencies: Object.keys(x.devDependencies || {}),
      })
    ),
  ])
    .then(([includes, dependencies]) => {
      const node_modules = [
        'assert',
        'buffer',
        'child_process',
        'cluster',
        'console',
        'constants',
        'crypto',
        'dgram',
        'dns',
        'domain',
        'events',
        'fs',
        'http',
        'https',
        'module',
        'net',
        'os',
        'path',
        'process',
        'punycode',
        'querystring',
        'readline',
        'repl',
        'stream',
        'string_decoder',
        'sys',
        'timers',
        'tls',
        'tty',
        'url',
        'util',
        'v8',
        'vm',
        'zlib',
      ];
      const unused = _.difference(
        dependencies.dependencies.concat(dependencies.devDependencies),
        includes
      );
      const extra = _.difference(
        includes,
        dependencies.dependencies.concat(dependencies.devDependencies).concat(node_modules)
      );
      return {
        unused, extra,
      };
    });
};
