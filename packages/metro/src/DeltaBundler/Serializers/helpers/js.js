/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

'use strict';

import type {MixedOutput, Module} from '../../types.flow';
import type {JsOutput} from 'metro-transform-worker';

const invariant = require('invariant');
const {addParamsToDefineCall} = require('metro-transform-plugins');
const path = require('path');

export type Options = {
  +createModuleId: string => number | string,
  +dev: boolean,
  +projectRoot: string,
  ...
};

function wrapModule(module: Module<>, options: Options): string {
  const output = getJsOutput(module);

  if (output.type.startsWith('js/script')) {
    return output.data.code;
  }

  const moduleId = options.createModuleId(module.path);
  const params = [
    moduleId,
    Array.from(module.dependencies.values()).map(dependency =>
      options.createModuleId(dependency.absolutePath),
    ),
  ];

  if (options.dev) {
    // Add the relative path of the module to make debugging easier.
    // This is mapped to `module.verboseName` in `require.js`.
    params.push(path.relative(options.projectRoot, module.path));
  }

  return addParamsToDefineCall(output.data.code, ...params);
}

function getJsOutput(
  module: $ReadOnly<{
    output: $ReadOnlyArray<MixedOutput>,
    path?: string,
    ...
  }>,
): JsOutput {
  const jsModules = module.output.filter(({type}) => type.startsWith('js/'));

  invariant(
    jsModules.length === 1,
    `Modules must have exactly one JS output, but ${module.path ??
      'unknown module'} has ${jsModules.length} JS outputs.`,
  );

  const jsOutput: JsOutput = (jsModules[0]: any);

  invariant(
    Number.isFinite(jsOutput.data.lineCount),
    `JS output must populate lineCount, but ${module.path ??
      'unknown module'} has ${jsOutput.type} output with lineCount '${
      jsOutput.data.lineCount
    }'`,
  );

  return jsOutput;
}

function isJsModule(module: Module<>): boolean {
  return module.output.filter(isJsOutput).length > 0;
}

function isJsOutput(output: MixedOutput): boolean %checks {
  return output.type.startsWith('js/');
}

module.exports = {
  getJsOutput,
  isJsModule,
  wrapModule,
};
