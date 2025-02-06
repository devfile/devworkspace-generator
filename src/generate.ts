/**********************************************************************
 * Copyright (c) 2022-2024
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import {
  V230Devfile,
  V230DevfileMetadata,
  V1alpha2DevWorkspace,
  V1alpha2DevWorkspaceMetadata,
  V1alpha2DevWorkspaceSpecContributions,
  V1alpha2DevWorkspaceTemplate,
  V1alpha2DevWorkspaceTemplateSpec,
} from '@devfile/api';
import { injectable, inject } from 'inversify';
import * as jsYaml from 'js-yaml';
import * as fs from 'fs-extra';
import { DevfileContext } from './api/devfile-context';
import { DevContainerComponentFinder } from './devfile/dev-container-component-finder';

type DevfileLike = V230Devfile & {
  metadata: V230DevfileMetadata & {
    generateName?: string;
  };
};

@injectable()
export class Generate {
  @inject(DevContainerComponentFinder)
  private devContainerComponentFinder: DevContainerComponentFinder;

  async generate(
    devfileContent: string,
    editorContent: string,
    outputFile?: string,
    injectDefaultComponent?: string,
    defaultComponentImage?: string,
  ): Promise<DevfileContext> {
    const context = await this.generateContent(
      devfileContent,
      editorContent,
      injectDefaultComponent,
      defaultComponentImage,
    );

    // write the result
    if (outputFile) {
      // write templates and then DevWorkspace in a single file
      const allContentArray = context.devWorkspaceTemplates.map(template => jsYaml.dump(template));
      allContentArray.push(jsYaml.dump(context.devWorkspace));

      const generatedContent = allContentArray.join('---\n');

      await fs.writeFile(outputFile, generatedContent, 'utf-8');
    }

    console.log(`DevWorkspace ${context.devWorkspaceTemplates[0].metadata.name} was generated`);
    return context;
  }

  async generateContent(
    devfileContent: string,
    editorContent: string,
    injectDefaultComponent?: string,
    defaultComponentImage?: string,
  ): Promise<DevfileContext> {
    const devfile = jsYaml.load(devfileContent);

    // sets the suffix to the devfile name
    const suffix = devfile.metadata.name || '';

    // devfile of the editor
    const editorDevfile = jsYaml.load(editorContent);

    // transform it into a devWorkspace template
    const metadata = this.createDevWorkspaceMetadata(editorDevfile);
    // add sufix
    metadata.name = `${metadata.name}-${suffix}`;
    delete editorDevfile.metadata;
    delete editorDevfile.schemaVersion;
    const editorDevWorkspaceTemplate: V1alpha2DevWorkspaceTemplate = {
      apiVersion: 'workspace.devfile.io/v1alpha2',
      kind: 'DevWorkspaceTemplate',
      metadata,
      spec: editorDevfile as V1alpha2DevWorkspaceTemplateSpec,
    };

    // transform it into a devWorkspace
    const devfileMetadata = this.createDevWorkspaceMetadata(devfile);
    const devfileCopy: V230Devfile = Object.assign({}, devfile);
    if (devfileCopy.metadata.attributes) {
      if (devfileCopy.attributes) {
        for (const key in devfileCopy.metadata.attributes) {
          if (devfileCopy.attributes[key] === undefined) {
            devfileCopy.attributes[key] = devfileCopy.metadata.attributes[key];
          } else {
            if (
              typeof devfileCopy.attributes[key] === 'object' &&
              typeof devfileCopy.metadata.attributes[key] === 'object'
            ) {
              devfileCopy.attributes[key] = Object.assign(
                devfileCopy.metadata.attributes[key],
                devfileCopy.attributes[key],
              );
            }
          }
        }
        Object.assign(devfileCopy.attributes, devfileCopy.metadata.attributes);
      } else {
        devfileCopy.attributes = devfileCopy.metadata.attributes;
      }
    }
    delete devfileCopy.schemaVersion;
    delete devfileCopy.metadata;
    const editorSpecContribution: V1alpha2DevWorkspaceSpecContributions = {
      name: 'editor',
      kubernetes: {
        name: editorDevWorkspaceTemplate.metadata.name,
      },
    };
    const devWorkspace: V1alpha2DevWorkspace = {
      apiVersion: 'workspace.devfile.io/v1alpha2',
      kind: 'DevWorkspace',
      metadata: devfileMetadata,
      spec: {
        started: true,
        routingClass: 'che',
        template: devfileCopy,
        contributions: [editorSpecContribution],
      },
    };

    // if the devfile has a starter project, we use it for the devWorkspace
    if (devfileCopy.starterProjects && devfileCopy.starterProjects.length > 0) {
      devWorkspace.spec.template.attributes = {
        'controller.devfile.io/use-starter-project': devfileCopy.starterProjects[0].name,
      };
    }

    // for now the list of devWorkspace templates is only the editor template
    const devWorkspaceTemplates = [editorDevWorkspaceTemplate];

    const context = {
      devfile,
      devWorkspace,
      devWorkspaceTemplates,
      suffix,
    };

    // find devContainer component, add a default one if not found
    await this.devContainerComponentFinder.find(context, injectDefaultComponent, defaultComponentImage);

    return context;
  }

  private createDevWorkspaceMetadata(devfile: DevfileLike): V1alpha2DevWorkspaceMetadata {
    const devWorkspaceMetadata = {} as V1alpha2DevWorkspaceMetadata;
    const devfileMetadata = devfile.metadata;

    if (devfileMetadata.name) {
      devWorkspaceMetadata.name = devfileMetadata.name;
    }
    if (devfileMetadata.generateName) {
      devWorkspaceMetadata.generateName = devfileMetadata.generateName;
    }

    return devWorkspaceMetadata;
  }
}
