/**********************************************************************
 * Copyright (c) 2022-2024
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import { InversifyBinding } from '../src/inversify/inversify-binding';
import { Main, DEVWORKSPACE_DEVFILE, DEVWORKSPACE_DEVFILE_SOURCE } from '../src/main';
import fs from 'fs-extra';
import * as jsYaml from 'js-yaml';
import * as axios from 'axios';
import { DEVWORKSPACE_METADATA_ANNOTATION } from '../src/generate';

describe('Test Main with stubs', () => {
  const FAKE_DEVFILE_PATH = '/my-fake-devfile-path';
  const FAKE_DEVFILE_URL = 'http://fake-devfile-url';
  const FAKE_EDITOR_PATH = '/my-fake-editor-path';
  const FAKE_OUTPUT_FILE = '/fake-output';
  const FAKE_EDITOR_URL = 'http://fake-editor.yaml';

  const originalConsoleError = console.error;
  const mockedConsoleError = jest.fn();

  const originalConsoleLog = console.log;
  const mockedConsoleLog = jest.fn();

  const generateMethod = jest.fn();
  const originalArgs = process.argv;
  const selfMock = {
    inSingletonScope: jest.fn(),
  };
  const toSelfMethod = jest.fn();
  const bindMock = {
    toSelf: toSelfMethod,
  };
  const generateMock = {
    generate: generateMethod as any,
  };

  const containerBindMethod = jest.fn();
  const containerGetMethod = jest.fn();
  const container = {
    bind: containerBindMethod,
    get: containerGetMethod,
  } as any;
  let spyInitBindings;

  function initArgs(
    devfilePath: string | undefined,
    devfileUrl: string | undefined,
    editorPath: string | undefined,
    editorUrl: string | undefined,
    outputFile: string | undefined,
    injectDefaultComponent: string | undefined,
    defaultComponentImage: string | undefined,
  ) {
    // empty args
    process.argv = ['', ''];
    if (devfilePath) {
      process.argv.push(`--devfile-path:${devfilePath}`);
    }
    if (devfileUrl) {
      process.argv.push(`--devfile-url:${devfileUrl}`);
    }
    if (editorUrl) {
      process.argv.push(`--editor-url:${editorUrl}`);
    }
    if (editorPath) {
      process.argv.push(`--editor-path:${editorPath}`);
    }
    if (outputFile) {
      process.argv.push(`--output-file:${outputFile}`);
    }
    if (defaultComponentImage) {
      process.argv.push(`--defaultComponentImage:${defaultComponentImage}`);
    }
    if (injectDefaultComponent) {
      process.argv.push(`--injectDefaultComponent:${injectDefaultComponent}`);
    }
  }

  beforeEach(() => {
    console.error = mockedConsoleError;
    console.log = mockedConsoleLog;
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  describe('start', () => {
    beforeEach(() => {
      initArgs(FAKE_DEVFILE_PATH, undefined, FAKE_EDITOR_PATH, undefined, FAKE_OUTPUT_FILE, undefined, undefined);
      jest.spyOn(fs, 'readFile').mockResolvedValue('');

      spyInitBindings = jest.spyOn(InversifyBinding.prototype, 'initBindings');
      spyInitBindings.mockImplementation(() => Promise.resolve(container));
      toSelfMethod.mockReturnValue(selfMock), containerBindMethod.mockReturnValue(bindMock);
      containerGetMethod.mockReturnValueOnce(generateMock);
    });

    afterEach(() => {
      process.argv = originalArgs;
      jest.restoreAllMocks();
      jest.resetAllMocks();
    });

    test('empty devfile', async () => {
      const main = new Main();

      containerGetMethod.mockReset();

      const validateDevfileMethod = jest.fn();
      const devfileSchemaValidatorMock = {
        validateDevfile: validateDevfileMethod as any,
      };
      validateDevfileMethod.mockReturnValueOnce(null);
      containerGetMethod.mockReturnValueOnce(devfileSchemaValidatorMock);
      containerGetMethod.mockReturnValueOnce(generateMock);

      const returnCode = await main.start();

      expect(returnCode).toBeFalsy();
      expect(generateMethod).toHaveBeenCalledTimes(0);
      expect(mockedConsoleError).toHaveBeenCalledTimes(2);
    });

    test('success with custom devfile Url', async () => {
      const main = new Main();
      initArgs(undefined, FAKE_DEVFILE_URL, undefined, FAKE_EDITOR_URL, FAKE_OUTPUT_FILE, 'true', 'my-image');
      process.argv.push('--project.foo=bar');
      containerGetMethod.mockReset();
      const githubResolverResolveMethod = jest.fn();
      const githubResolverMock = {
        resolve: githubResolverResolveMethod as any,
      };

      const getContentUrlMethod = jest.fn();
      const getCloneUrlMethod = jest.fn();
      const getBranchNameMethod = jest.fn();
      const getRepoNameMethod = jest.fn();

      const githubUrlMock = {
        getContentUrl: githubResolverResolveMethod as any,
        getCloneUrl: getCloneUrlMethod as any,
        getBranchName: getBranchNameMethod as any,
        getRepoName: getRepoNameMethod as any,
      };
      getContentUrlMethod.mockReturnValue('http://foo.bar');
      getCloneUrlMethod.mockReturnValue('http://foo.bar');
      getBranchNameMethod.mockReturnValue('my-branch');
      getRepoNameMethod.mockReturnValue('my-repo');
      githubResolverResolveMethod.mockReturnValue(githubUrlMock);
      containerGetMethod.mockReturnValueOnce(githubResolverMock);

      const urlFetcherFetchTextMethod = jest.fn();
      const urlFetcherMock = {
        fetchText: urlFetcherFetchTextMethod as any,
      };
      urlFetcherFetchTextMethod.mockReturnValueOnce('schemaVersion: 2.1.0');
      containerGetMethod.mockReturnValueOnce(urlFetcherMock);

      const validateDevfileMethod = jest.fn();
      const devfileSchemaValidatorMock = {
        validateDevfile: validateDevfileMethod as any,
      };
      validateDevfileMethod.mockReturnValueOnce({ valid: true });
      containerGetMethod.mockReturnValueOnce(devfileSchemaValidatorMock);

      const loadEditorMethod = jest.fn();
      const editorResolverMock = {
        loadEditor: loadEditorMethod as any,
      };
      loadEditorMethod.mockReturnValue('');
      containerGetMethod.mockReturnValueOnce(editorResolverMock);

      // last one is generate mock
      containerGetMethod.mockReturnValueOnce(generateMock);
      const returnCode = await main.start();
      expect(mockedConsoleError).toHaveBeenCalledTimes(0);
      expect(loadEditorMethod).toHaveBeenCalled();
      expect(urlFetcherFetchTextMethod).toHaveBeenCalled();

      expect(returnCode).toBeTruthy();

      const result = {
        schemaVersion: '2.1.0',
        attributes: {
          [DEVWORKSPACE_METADATA_ANNOTATION]: {
            [DEVWORKSPACE_DEVFILE]: 'schemaVersion: 2.1.0',
            [DEVWORKSPACE_DEVFILE_SOURCE]: jsYaml.dump({
              factory: {
                params: `url=${FAKE_DEVFILE_URL}`,
              },
            }),
          },
        },
        projects: [
          {
            name: 'my-repo',
            git: {
              remotes: {
                origin: 'http://foo.bar',
              },
              checkoutFrom: {
                revision: 'my-branch',
              },
            },
          },
        ],
      };
      expect(generateMethod).toHaveBeenCalledWith(jsYaml.dump(result), "''\n", FAKE_OUTPUT_FILE, 'true', 'my-image');
    });

    test('success with custom devfile Url (devfile includes attributes)', async () => {
      const main = new Main();
      initArgs(undefined, FAKE_DEVFILE_URL, undefined, FAKE_EDITOR_URL, FAKE_OUTPUT_FILE, 'true', 'my-image');
      process.argv.push('--project.foo=bar');
      containerGetMethod.mockReset();
      const githubResolverResolveMethod = jest.fn();
      const githubResolverMock = {
        resolve: githubResolverResolveMethod as any,
      };

      const getContentUrlMethod = jest.fn();
      const getCloneUrlMethod = jest.fn();
      const getBranchNameMethod = jest.fn();
      const getRepoNameMethod = jest.fn();

      const githubUrlMock = {
        getContentUrl: githubResolverResolveMethod as any,
        getCloneUrl: getCloneUrlMethod as any,
        getBranchName: getBranchNameMethod as any,
        getRepoName: getRepoNameMethod as any,
      };
      getContentUrlMethod.mockReturnValue('http://foo.bar');
      getCloneUrlMethod.mockReturnValue('http://foo.bar');
      getBranchNameMethod.mockReturnValue('my-branch');
      getRepoNameMethod.mockReturnValue('my-repo');
      githubResolverResolveMethod.mockReturnValue(githubUrlMock);
      containerGetMethod.mockReturnValueOnce(githubResolverMock);

      const urlFetcherFetchTextMethod = jest.fn();
      const urlFetcherMock = {
        fetchText: urlFetcherFetchTextMethod as any,
      };
      urlFetcherFetchTextMethod.mockReturnValueOnce('schemaVersion: 2.1.0\nattributes:\n  foo: bar');
      containerGetMethod.mockReturnValueOnce(urlFetcherMock);

      const validateDevfileMethod = jest.fn();
      const devfileSchemaValidatorMock = {
        validateDevfile: validateDevfileMethod as any,
      };
      validateDevfileMethod.mockReturnValueOnce({ valid: true });
      containerGetMethod.mockReturnValueOnce(devfileSchemaValidatorMock);

      const loadEditorMethod = jest.fn();
      const editorResolverMock = {
        loadEditor: loadEditorMethod as any,
      };
      loadEditorMethod.mockReturnValue('');
      containerGetMethod.mockReturnValueOnce(editorResolverMock);

      // last one is generate mock
      containerGetMethod.mockReturnValueOnce(generateMock);
      const returnCode = await main.start();
      expect(mockedConsoleError).toHaveBeenCalledTimes(0);
      expect(loadEditorMethod).toHaveBeenCalled();
      expect(urlFetcherFetchTextMethod).toHaveBeenCalled();

      expect(returnCode).toBeTruthy();

      const result = {
        schemaVersion: '2.1.0',
        attributes: {
          foo: 'bar',
          [DEVWORKSPACE_METADATA_ANNOTATION]: {
            [DEVWORKSPACE_DEVFILE]: 'schemaVersion: 2.1.0\nattributes:\n  foo: bar',
            [DEVWORKSPACE_DEVFILE_SOURCE]: jsYaml.dump({
              factory: {
                params: `url=${FAKE_DEVFILE_URL}`,
              },
            }),
          },
        },
        projects: [
          {
            name: 'my-repo',
            git: {
              remotes: {
                origin: 'http://foo.bar',
              },
              checkoutFrom: {
                revision: 'my-branch',
              },
            },
          },
        ],
      };
      expect(generateMethod).toHaveBeenCalledWith(jsYaml.dump(result), "''\n", FAKE_OUTPUT_FILE, 'true', 'my-image');
    });

    test('success with custom devfile Url that already has projects', async () => {
      const main = new Main();
      initArgs(undefined, FAKE_DEVFILE_URL, undefined, FAKE_EDITOR_URL, FAKE_OUTPUT_FILE, 'false', undefined);
      containerGetMethod.mockReset();
      const githubResolverResolveMethod = jest.fn();
      const githubResolverMock = {
        resolve: githubResolverResolveMethod as any,
      };

      const getContentUrlMethod = jest.fn();
      const getCloneUrlMethod = jest.fn();
      const getBranchNameMethod = jest.fn();
      const getRepoNameMethod = jest.fn();

      const githubUrlMock = {
        getContentUrl: githubResolverResolveMethod as any,
        getCloneUrl: getCloneUrlMethod as any,
        getBranchName: getBranchNameMethod as any,
        getRepoName: getRepoNameMethod as any,
      };
      getContentUrlMethod.mockReturnValue('http://foo.bar');
      getCloneUrlMethod.mockReturnValue('http://foo.bar');
      getBranchNameMethod.mockReturnValue('my-branch');
      getRepoNameMethod.mockReturnValue('my-repo');
      githubResolverResolveMethod.mockReturnValue(githubUrlMock);
      containerGetMethod.mockReturnValueOnce(githubResolverMock);

      const urlFetcherFetchTextMethod = jest.fn();
      const urlFetcherMock = {
        fetchText: urlFetcherFetchTextMethod as any,
      };
      // Return devfile that already has projects - this should NOT add projects
      urlFetcherFetchTextMethod.mockReturnValueOnce(
        'schemaVersion: 2.1.0\nmetadata:\n  name: test\nprojects:\n  - name: existing-project\n    git:\n      remotes:\n        origin: http://existing.git',
      );
      containerGetMethod.mockReturnValueOnce(urlFetcherMock);

      const validateDevfileMethod = jest.fn();
      const devfileSchemaValidatorMock = {
        validateDevfile: validateDevfileMethod as any,
      };
      validateDevfileMethod.mockReturnValueOnce({ valid: true });
      containerGetMethod.mockReturnValueOnce(devfileSchemaValidatorMock);

      const loadEditorMethod = jest.fn();
      const editorResolverMock = {
        loadEditor: loadEditorMethod as any,
      };
      loadEditorMethod.mockReturnValue('');
      containerGetMethod.mockReturnValueOnce(editorResolverMock);

      // last one is generate mock
      containerGetMethod.mockReturnValueOnce(generateMock);
      const returnCode = await main.start();
      expect(mockedConsoleError).toHaveBeenCalledTimes(0);
      expect(loadEditorMethod).toHaveBeenCalled();
      expect(urlFetcherFetchTextMethod).toHaveBeenCalled();

      expect(returnCode).toBeTruthy();

      const devfileContent =
        'schemaVersion: 2.1.0\nmetadata:\n  name: test\nprojects:\n  - name: existing-project\n    git:\n      remotes:\n        origin: http://existing.git';
      const devfileParsed = jsYaml.load(devfileContent) as any;
      devfileParsed.attributes = {
        [DEVWORKSPACE_METADATA_ANNOTATION]: {
          [DEVWORKSPACE_DEVFILE]: devfileContent,
          [DEVWORKSPACE_DEVFILE_SOURCE]: jsYaml.dump({
            factory: {
              params: `url=${FAKE_DEVFILE_URL}`,
            },
          }),
        },
      };
      expect(generateMethod).toHaveBeenCalledWith(
        jsYaml.dump(devfileParsed),
        "''\n",
        FAKE_OUTPUT_FILE,
        'false',
        undefined,
      );
    });

    test('missing devfile', async () => {
      const main = new Main();
      initArgs(undefined, undefined, FAKE_EDITOR_PATH, FAKE_DEVFILE_URL, FAKE_OUTPUT_FILE, 'false', undefined);
      const returnCode = await main.start();
      expect(mockedConsoleError).toHaveBeenCalled();
      expect(mockedConsoleError.mock.calls[1][1].toString()).toContain('missing --devfile-path:');
      expect(returnCode).toBeFalsy();
      expect(generateMethod).toHaveBeenCalledTimes(0);
    });

    test('missing editor', async () => {
      const main = new Main();
      initArgs(FAKE_DEVFILE_PATH, undefined, undefined, undefined, FAKE_OUTPUT_FILE, 'false', undefined);

      const returnCode = await main.start();
      expect(mockedConsoleError).toHaveBeenCalled();
      expect(mockedConsoleError.mock.calls[1][1].toString()).toContain('missing --editor-path:');
      expect(returnCode).toBeFalsy();
      expect(generateMethod).toHaveBeenCalledTimes(0);
    });

    test('missing outputfile', async () => {
      const main = new Main();
      initArgs(FAKE_DEVFILE_PATH, undefined, FAKE_EDITOR_PATH, undefined, undefined, 'false', undefined);
      const returnCode = await main.start();
      expect(mockedConsoleError).toHaveBeenCalled();
      expect(mockedConsoleError.mock.calls[1][1].toString()).toContain('missing --output-file: parameter');
      expect(returnCode).toBeFalsy();
      expect(generateMethod).toHaveBeenCalledTimes(0);
    });

    test('error', async () => {
      jest.spyOn(InversifyBinding.prototype, 'initBindings').mockImplementation(() => {
        throw new Error('Dummy error');
      });
      const main = new Main();
      const returnCode = await main.start();
      expect(mockedConsoleError).toHaveBeenCalled();
      expect(returnCode).toBeFalsy();
      expect(generateMethod).toHaveBeenCalledTimes(0);
    });
  });

  describe('generateDevfileContext', () => {
    beforeEach(() => {
      spyInitBindings = jest.spyOn(InversifyBinding.prototype, 'initBindings');
      spyInitBindings.mockImplementation(() => Promise.resolve(container));
      toSelfMethod.mockReturnValue(selfMock), containerBindMethod.mockReturnValue(bindMock);
    });

    afterEach(() => {
      process.argv = originalArgs;
      jest.restoreAllMocks();
      jest.resetAllMocks();
    });

    test('missing editor', async () => {
      const main = new Main();
      let message: string | undefined;
      try {
        await main.generateDevfileContext(
          {
            devfilePath: FAKE_DEVFILE_PATH,
            projects: [],
          },
          axios.default,
        );
        throw new Error('Dummy error');
      } catch (e) {
        message = e.message;
      }
      expect(message).toEqual('missing editorPath or editorUrl or editorContent');
    });

    test('missing devfile', async () => {
      const main = new Main();
      let message: string | undefined;
      try {
        await main.generateDevfileContext(
          {
            editorUrl: FAKE_EDITOR_URL,
            projects: [],
          },
          axios.default,
        );
        throw new Error('Dummy error');
      } catch (e) {
        message = e.message;
      }
      expect(message).toEqual('missing devfilePath or devfileUrl or devfileContent');
    });

    test('success with custom default image', async () => {
      const main = new Main();
      containerGetMethod.mockReset();

      const validateDevfileMethod = jest.fn();
      const devfileSchemaValidatorMock = {
        validateDevfile: validateDevfileMethod as any,
      };
      validateDevfileMethod.mockReturnValueOnce({ valid: true });
      containerGetMethod.mockReturnValueOnce(devfileSchemaValidatorMock);

      const loadEditorMethod = jest.fn();
      const editorResolverMock = {
        loadEditor: loadEditorMethod as any,
      };
      loadEditorMethod.mockReturnValue('');
      containerGetMethod.mockReturnValueOnce(editorResolverMock);

      // last one is generate mock
      containerGetMethod.mockReturnValueOnce(generateMock);

      const devfileContent = jsYaml.dump({
        schemaVersion: '2.1.0',
        projects: [
          {
            name: 'my-repo',
            git: {
              remotes: {
                origin: 'http://foo.bar',
              },
              checkoutFrom: {
                revision: 'my-branch',
              },
            },
          },
        ],
      });

      await main.generateDevfileContext(
        {
          devfileContent,
          outputFile: FAKE_OUTPUT_FILE,
          editorUrl: FAKE_EDITOR_URL,
          projects: [],
          injectDefaultComponent: 'true',
          defaultComponentImage: 'quay.io/custom-image:next',
        },
        axios.default,
      );

      expect(validateDevfileMethod).toHaveBeenCalled();
      expect(mockedConsoleError).toHaveBeenCalledTimes(0);
      expect(loadEditorMethod).toHaveBeenCalled();
      expect(generateMethod).toHaveBeenCalledWith(
        devfileContent,
        "''\n",
        FAKE_OUTPUT_FILE,
        'true',
        'quay.io/custom-image:next',
      );
    });

    test('success with custom devfile content', async () => {
      const main = new Main();
      containerGetMethod.mockReset();
      const validateDevfileMethod = jest.fn();
      const devfileSchemaValidatorMock = {
        validateDevfile: validateDevfileMethod as any,
      };
      validateDevfileMethod.mockReturnValueOnce({ valid: true });
      containerGetMethod.mockReturnValueOnce(devfileSchemaValidatorMock);

      const loadEditorMethod = jest.fn();
      const editorResolverMock = {
        loadEditor: loadEditorMethod as any,
      };
      loadEditorMethod.mockReturnValue('');
      containerGetMethod.mockReturnValueOnce(editorResolverMock);

      // last one is generate mock
      containerGetMethod.mockReturnValueOnce(generateMock);

      const devfileContent = jsYaml.dump({
        schemaVersion: '2.1.0',
        projects: [
          {
            name: 'my-repo',
            git: {
              remotes: {
                origin: 'http://foo.bar',
              },
              checkoutFrom: {
                revision: 'my-branch',
              },
            },
          },
        ],
      });

      await main.generateDevfileContext(
        {
          devfileContent,
          outputFile: FAKE_OUTPUT_FILE,
          editorUrl: FAKE_EDITOR_URL,
          projects: [],
        },
        axios.default,
      );

      expect(mockedConsoleError).toHaveBeenCalledTimes(0);
      expect(loadEditorMethod).toHaveBeenCalled();
      expect(validateDevfileMethod).toHaveBeenCalled();
      expect(generateMethod).toHaveBeenCalledWith(devfileContent, "''\n", FAKE_OUTPUT_FILE, undefined, undefined);
    });

    test('devfile without schemaVersion', async () => {
      const main = new Main();
      containerGetMethod.mockReset();

      // devfile without schemaVersion
      const devfileContent = jsYaml.dump({
        metadata: {
          name: 'my-repo',
        },
      });

      await expect(
        main.generateDevfileContext(
          {
            devfileContent,
            outputFile: FAKE_OUTPUT_FILE,
            editorUrl: FAKE_EDITOR_URL,
            projects: [],
          },
          axios.default,
        ),
      ).rejects.toThrow('Devfile is not valid, schemaVersion is required');
    });

    test('success with custom editor content', async () => {
      const main = new Main();
      containerGetMethod.mockReset();
      const validateDevfileMethod = jest.fn();
      const devfileSchemaValidatorMock = {
        validateDevfile: validateDevfileMethod as any,
      };
      validateDevfileMethod.mockReturnValueOnce({ valid: true });
      containerGetMethod.mockReturnValueOnce(devfileSchemaValidatorMock);

      // last one is generate mock
      containerGetMethod.mockReturnValueOnce(generateMock);

      const devfileContent = jsYaml.dump({
        schemaVersion: '2.1.0',
        projects: [
          {
            name: 'my-repo',
            git: {
              remotes: {
                origin: 'http://foo.bar',
              },
              checkoutFrom: {
                revision: 'my-branch',
              },
            },
          },
        ],
      });

      const editorContent = jsYaml.dump({
        schemaVersion: '2.1.0',
        metadata: {
          name: 'che-incubator/che-pycharm/latest',
        },
        components: {
          name: 'che-pycharm-runtime-description',
          image: 'quay.io/devfile/universal-developer-image:ubi8',
        },
      });

      await main.generateDevfileContext(
        {
          devfileContent,
          outputFile: FAKE_OUTPUT_FILE,
          editorContent,
          projects: [],
        },
        axios.default,
      );

      expect(mockedConsoleError).toHaveBeenCalledTimes(0);
      expect(validateDevfileMethod).toHaveBeenCalled();
      expect(generateMethod).toHaveBeenCalledWith(
        devfileContent,
        jsYaml.dump({
          schemaVersion: '2.1.0',
          metadata: {
            name: 'che-incubator/che-pycharm/latest',
          },
          components: {
            name: 'che-pycharm-runtime-description',
            image: 'quay.io/devfile/universal-developer-image:ubi8',
          },
        }),
        FAKE_OUTPUT_FILE,
        undefined,
        undefined,
      );
    });

    test('success with editor path', async () => {
      const main = new Main();
      containerGetMethod.mockReset();
      const validateDevfileMethod = jest.fn();
      const devfileSchemaValidatorMock = {
        validateDevfile: validateDevfileMethod as any,
      };
      validateDevfileMethod.mockReturnValueOnce({ valid: true });
      containerGetMethod.mockReturnValueOnce(devfileSchemaValidatorMock);

      // last one is generate mock
      containerGetMethod.mockReturnValueOnce(generateMock);

      const devfileContent = jsYaml.dump({
        schemaVersion: '2.1.0',
      });
      const editorContent = 'editor content';

      jest.spyOn(fs, 'readFile').mockResolvedValue(editorContent);
      await main.generateDevfileContext(
        {
          devfileContent,
          outputFile: FAKE_OUTPUT_FILE,
          editorPath: FAKE_EDITOR_PATH,
          projects: [],
        },
        axios.default,
      );

      expect(mockedConsoleError).toHaveBeenCalledTimes(0);
      expect(validateDevfileMethod).toHaveBeenCalled();
      expect(generateMethod).toHaveBeenCalledWith(
        devfileContent,
        editorContent,
        FAKE_OUTPUT_FILE,
        undefined,
        undefined,
      );
    });

    test('failed with not valid devfile', async () => {
      const main = new Main();
      containerGetMethod.mockReset();

      const validationResult = {
        toString: () => 'Dummy error',
      };

      const validateDevfileMethod = jest.fn();
      const devfileSchemaValidatorMock = {
        validateDevfile: validateDevfileMethod as any,
      };
      validateDevfileMethod.mockReturnValueOnce(validationResult);
      containerGetMethod.mockReturnValueOnce(devfileSchemaValidatorMock);

      // last one is generate mock
      containerGetMethod.mockReturnValueOnce(generateMock);

      const devfileContent = jsYaml.dump({
        schemaVersion: '2.1.0',
      });
      const editorContent = 'editor content';

      jest.spyOn(fs, 'readFile').mockResolvedValue(editorContent);
      await expect(
        main.generateDevfileContext(
          {
            devfileContent,
            outputFile: FAKE_OUTPUT_FILE,
            editorPath: FAKE_EDITOR_PATH,
            projects: [],
          },
          axios.default,
        ),
      ).rejects.toThrow('Devfile schema validation failed. Error: Dummy error');

      expect(validateDevfileMethod).toHaveBeenCalled();
    });
  });

  describe('replaceIfExistingProjects', () => {
    test('empty', async () => {
      const devfileContent = '';
      const projects = [];
      const main = new Main();
      const result = main.replaceIfExistingProjects(devfileContent, projects);
      expect(result).toBe('');
    });

    test('empty with user projects', async () => {
      const devfileContent = '';
      const projects = [
        {
          name: 'my-other-repo',
          location: 'http://my-location',
        },
      ];
      const main = new Main();
      const result = main.replaceIfExistingProjects(devfileContent, projects);
      expect(result).toBe('');
    });

    test('existing projects not matching', async () => {
      const initialProjects = [
        {
          name: 'my-repo',
          git: {
            remotes: {
              origin: 'http://my.origin',
            },
            checkoutFrom: {
              revision: 'my-branch',
            },
          },
        },
      ];

      const devfileContent = jsYaml.dump({
        projects: initialProjects,
      });
      const projects = [
        {
          name: 'my-other-repo',
          location: 'http://my-location',
        },
      ];
      const main = new Main();
      const result = main.replaceIfExistingProjects(devfileContent, projects);
      const devfileResult = jsYaml.load(result);
      expect(devfileResult.projects).toStrictEqual(initialProjects);
    });

    test('existing projects matching zip', async () => {
      const initialProjects = [
        {
          name: 'my-repo',
          git: {
            remotes: {
              origin: 'http://my.origin',
            },
            checkoutFrom: {
              revision: 'my-branch',
            },
          },
        },
      ];

      const devfileContent = jsYaml.dump({
        projects: initialProjects,
      });
      const projects = [
        {
          name: 'my-repo',
          location: 'http://my-location.zip',
        },
      ];
      const main = new Main();
      const result = main.replaceIfExistingProjects(devfileContent, projects);
      const devfileResult = jsYaml.load(result);

      const expectedProjects = [
        {
          name: 'my-repo',
          zip: {
            location: 'http://my-location.zip',
          },
        },
      ];
      expect(devfileResult.projects).toStrictEqual(expectedProjects);
    });

    test('existing projects matching git', async () => {
      const initialProjects = [
        {
          name: 'my-repo',
          git: {
            remotes: {
              origin: 'http://my.origin',
            },
            checkoutFrom: {
              revision: 'my-branch',
            },
          },
        },
      ];

      const devfileContent = jsYaml.dump({
        projects: initialProjects,
      });
      const projects = [
        {
          name: 'my-repo',
          location: 'http://my-another-location',
        },
      ];
      const main = new Main();
      const result = main.replaceIfExistingProjects(devfileContent, projects);
      const devfileResult = jsYaml.load(result);

      const expectedProjects = [];
      Object.assign(expectedProjects, initialProjects);
      expectedProjects[0].git.remotes.origin = 'http://my-another-location';
      expect(devfileResult.projects).toStrictEqual(expectedProjects);
    });
  });
});
