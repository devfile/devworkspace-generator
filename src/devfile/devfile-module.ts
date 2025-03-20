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

import { DevContainerComponentFinder } from './dev-container-component-finder';
import { DevContainerComponentInserter } from './dev-container-component-inserter';

const devfileModule = new ContainerModule((options: ContainerModuleLoadOptions) => {
  options.bind(DevContainerComponentFinder).toSelf().inSingletonScope();
  options.bind(DevContainerComponentInserter).toSelf().inSingletonScope();
});

export { devfileModule };
