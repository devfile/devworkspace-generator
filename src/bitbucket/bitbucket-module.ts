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

import { BitbucketResolver } from './bitbucket-resolver';
import { TYPES } from '../types';

const { Resolver } = TYPES;

const bitbucketModule = new ContainerModule((options: ContainerModuleLoadOptions) => {
  options.bind(Resolver).to(BitbucketResolver).inSingletonScope();
});

export { bitbucketModule };
