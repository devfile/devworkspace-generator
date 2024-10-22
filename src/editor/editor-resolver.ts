/**********************************************************************
 * Copyright (c) 2022-2024
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import * as jsYaml from 'js-yaml';

import { inject, injectable } from 'inversify';

import { UrlFetcher } from '../fetch/url-fetcher';

/**
 * Resolve plug-ins by grabbing the definition from the plug-in registry.
 */
@injectable()
export class EditorResolver {
  @inject(UrlFetcher)
  private urlFetcher: UrlFetcher;

  // Editor URL (like https://raw.githubusercontent.com/eclipse-che/che-operator/refs/heads/main/editors-definitions/che-code-latest.yaml)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async loadEditor(editorUrl: string): Promise<any> {
    const devfileContent = await this.urlFetcher.fetchText(editorUrl);
    return jsYaml.load(devfileContent);
  }
}
