/**********************************************************************
 * Copyright (c) 2022-2024
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import { convertDevContainerToDevfile } from '../../src/devcontainers/dev-containers-to-devfile-adapter';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

describe('convertDevContainerToDevfile - integration test from files', () => {
  const testCases = [
    'basic-node',
    'minimal',
    'host-requirements',
    'override-command',
    'dockerfile',
    'lifecycle-scripts',
    'unsupported-fields',
  ];

  test.each(testCases)('test case: %s', async testCaseName => {
    const baseDir = path.join(__dirname, 'testdata', testCaseName);

    const devContainerPath = path.join(baseDir, 'input-devcontainer.json');
    const expectedYamlPath = path.join(baseDir, 'expected.yaml');

    const devContainerContent = await fs.readFile(devContainerPath, 'utf-8');
    const expectedYamlContent = await fs.readFile(expectedYamlPath, 'utf-8');

    const devContainer = JSON.parse(devContainerContent);
    const expectedDevfile = yaml.load(expectedYamlContent);
    const actualDevfileYaml = convertDevContainerToDevfile(devContainer);
    const actualDevfile = yaml.load(actualDevfileYaml);

    expect(actualDevfile).toMatchObject(expectedDevfile);
  });
});
