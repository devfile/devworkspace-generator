/**********************************************************************
 * Copyright (c) 2022-2025
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
import { ContainerModule, ContainerModuleLoadOptions } from 'inversify';

import { EditorResolver } from './editor-resolver';

const editorModule = new ContainerModule((options: ContainerModuleLoadOptions) => {
  options.bind(EditorResolver).toSelf().inSingletonScope();
});

export { editorModule };
