/**********************************************************************
 * Copyright (c) 2022-2024
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as axios from 'axios';
import * as fs from 'fs-extra';
import { Generate, DEVWORKSPACE_METADATA_ANNOTATION } from './generate';
import { DevfileSchemaValidator } from './devfile-schema/devfile-schema-validator';
import * as jsYaml from 'js-yaml';
import { InversifyBinding } from './inversify/inversify-binding';
import { UrlFetcher } from './fetch/url-fetcher';
import { EditorResolver } from './editor/editor-resolver';
import { V1alpha2DevWorkspaceSpecTemplate } from '@devfile/api';
import { DevfileContext } from './api/devfile-context';
import { GitUrlResolver } from './resolve/git-url-resolver';
import { ValidatorResult } from 'jsonschema';
import { convertDevContainerToDevfile } from './devcontainers/dev-containers-to-devfile-adapter';

export const DEVWORKSPACE_DEVFILE = 'che.eclipse.org/devfile';
export const DEVWORKSPACE_DEVFILE_SOURCE = 'che.eclipse.org/devfile-source';

export class Main {
  /**
   * Default constructor.
   */
  constructor() {
    // no-op
  }
  // Generates a devfile context object based on params
  public async generateDevfileContext(
    params: {
      devfilePath?: string;
      devfileUrl?: string;
      devfileContent?: string;
      devContainerJsonContent?: string;
      outputFile?: string;
      editorPath?: string;
      editorContent?: string;
      editorUrl?: string;
      projects: { name: string; location: string }[];
      injectDefaultComponent?: string;
      defaultComponentImage?: string;
    },
    axiosInstance: axios.AxiosInstance,
  ): Promise<DevfileContext> {
    if (!params.editorPath && !params.editorUrl && !params.editorContent) {
      throw new Error('missing editorPath or editorUrl or editorContent');
    }
    if (!params.devfilePath && !params.devfileUrl && !params.devfileContent && !params.devContainerJsonContent) {
      throw new Error('missing devfilePath or devfileUrl or devfileContent or devContainerJsonContent');
    }

    const inversifyBinbding = new InversifyBinding();
    const container = await inversifyBinbding.initBindings({
      axiosInstance,
    });
    container.bind(Generate).toSelf().inSingletonScope();

    let devfileContent;
    let editorContent;

    // gets the repo URL
    if (params.devfileUrl) {
      const resolver = container.get(GitUrlResolver);
      const url = resolver.resolve(params.devfileUrl);
      // user devfile
      devfileContent = await container.get(UrlFetcher).fetchText(url.getContentUrl('devfile.yaml'));

      // load content
      const devfileParsed = jsYaml.load(devfileContent);

      if (!devfileParsed.attributes) {
        devfileParsed.attributes = {};
      }
      devfileParsed.attributes[DEVWORKSPACE_METADATA_ANNOTATION] = {
        [DEVWORKSPACE_DEVFILE]: devfileContent,
        [DEVWORKSPACE_DEVFILE_SOURCE]: jsYaml.dump({
          factory: {
            params: 'url=' + params.devfileUrl,
          },
        }),
      };

      // is there projects in the devfile ?
      if (devfileParsed && !devfileParsed.projects) {
        // no, so add the current project being cloned
        devfileParsed.projects = [
          {
            name: url.getRepoName(),
            git: {
              remotes: { origin: url.getCloneUrl() },
              checkoutFrom: { revision: url.getBranchName() },
            },
          },
        ];
      }
      // get back the content
      devfileContent = jsYaml.dump(devfileParsed);
    } else if (params.devfilePath) {
      devfileContent = await fs.readFile(params.devfilePath);
    } else if (params.devfileContent) {
      devfileContent = params.devfileContent;
    } else if (params.devContainerJsonContent) {
      const devContainer = JSON.parse(params.devContainerJsonContent);
      devfileContent = convertDevContainerToDevfile(devContainer);
    }

    const jsYamlDevfileContent = jsYaml.load(devfileContent);
    const schemaVersion = jsYamlDevfileContent.schemaVersion;
    if (!schemaVersion) {
      throw new Error(`Devfile is not valid, schemaVersion is required`);
    }

    // validate devfile
    const devfileSchemaValidator = container.get(DevfileSchemaValidator);
    console.log(`Validating devfile`);
    const validationResult: ValidatorResult = devfileSchemaValidator.validateDevfile(
      jsYamlDevfileContent,
      schemaVersion,
    );
    if (!validationResult.valid) {
      throw new Error(`Devfile schema validation failed. Error: ${validationResult.toString()}`);
    }
    console.log(`Devfile is valid with schema version ${schemaVersion}`);

    // enhance projects
    devfileContent = this.replaceIfExistingProjects(devfileContent, params.projects);

    if (params.editorContent) {
      editorContent = params.editorContent;
    } else if (params.editorUrl) {
      // devfile of the editor
      const editorDevfile = await container.get(EditorResolver).loadEditor(params.editorUrl);
      editorContent = jsYaml.dump(editorDevfile);
    } else {
      editorContent = await fs.readFile(params.editorPath);
    }

    const generate = container.get(Generate);
    return generate.generate(
      devfileContent,
      editorContent,
      params.outputFile,
      params.injectDefaultComponent,
      params.defaultComponentImage,
    );
  }

  // Update project entry based on the projects passed as parameter
  public replaceIfExistingProjects(devfileContent: string, projects: { name: string; location: string }[]): string {
    // do nothing if no override
    if (projects.length === 0) {
      return devfileContent;
    }
    const devfileParsed: V1alpha2DevWorkspaceSpecTemplate = jsYaml.load(devfileContent);

    if (!devfileParsed || !devfileParsed.projects) {
      return devfileContent;
    }
    devfileParsed.projects = devfileParsed.projects.map(project => {
      const userProjectConfiguration = projects.find(p => p.name === project.name);
      if (userProjectConfiguration) {
        if (userProjectConfiguration.location.endsWith('.zip')) {
          // delete git section and use instead zip
          delete project.git;
          project.zip = { location: userProjectConfiguration.location };
        } else {
          project.git.remotes.origin = userProjectConfiguration.location;
        }
      }
      return project;
    });
    return jsYaml.dump(devfileParsed);
  }

  async start(): Promise<boolean> {
    let devfilePath: string | undefined;
    let devfileUrl: string | undefined;
    let outputFile: string | undefined;
    let editorPath: string | undefined;
    let editorUrl: string | undefined;
    let injectDefaultComponent: string | undefined;
    let defaultComponentImage: string | undefined;
    let devContainerJsonContent: string | undefined;
    const projects: { name: string; location: string }[] = [];

    const args = process.argv.slice(2);
    args.forEach(arg => {
      if (arg.startsWith('--devfile-path:')) {
        devfilePath = arg.substring('--devfile-path:'.length);
      }
      if (arg.startsWith('--devfile-url:')) {
        devfileUrl = arg.substring('--devfile-url:'.length);
      }
      if (arg.startsWith('--editor-url:')) {
        editorUrl = arg.substring('--editor-url:'.length);
      }
      if (arg.startsWith('--editor-path:')) {
        editorPath = arg.substring('--editor-path:'.length);
      }
      if (arg.startsWith('--output-file:')) {
        outputFile = arg.substring('--output-file:'.length);
      }
      if (arg.startsWith('--devcontainer-json:')) {
        devContainerJsonContent = arg.substring('--devcontainer-json:'.length);
      }
      if (arg.startsWith('--project.')) {
        const name = arg.substring('--project.'.length, arg.indexOf('='));
        let location = arg.substring(arg.indexOf('=') + 1);
        location = location.replace('{{_INTERNAL_URL_}}', '{{ INTERNAL_URL }}');

        projects.push({ name, location });
      }
      if (arg.startsWith('--injectDefaultComponent:')) {
        injectDefaultComponent = arg.substring('--injectDefaultComponent:'.length);
      }
      if (arg.startsWith('--defaultComponentImage:')) {
        defaultComponentImage = arg.substring('--defaultComponentImage:'.length);
      }
    });

    try {
      if (!editorPath && !editorUrl) {
        throw new Error('missing --editor-path: or --editor-url: parameter');
      }
      if (!devfilePath && !devfileUrl && !devContainerJsonContent) {
        throw new Error('missing --devfile-path: or --devfile-url: parameter or --devcontainer-json: parameter');
      }
      if (!outputFile) {
        throw new Error('missing --output-file: parameter');
      }
      await this.generateDevfileContext(
        {
          devfilePath,
          devfileUrl,
          editorPath,
          devContainerJsonContent: devContainerJsonContent,
          outputFile,
          editorUrl,
          projects,
          injectDefaultComponent,
          defaultComponentImage,
        },
        axios.default,
      );
      return true;
    } catch (error) {
      console.error('stack=' + error.stack);
      console.error('Unable to start', error);
      return false;
    }
  }
}
