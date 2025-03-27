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

import { BitbucketServerResolver } from './bitbucket-server-resolver';
import { TYPES } from '../types';

const { Resolver } = TYPES;

const bitbucketServerModule = new ContainerModule((options: ContainerModuleLoadOptions) => {
  options.bind(Resolver).to(BitbucketServerResolver).inSingletonScope();
});

export { bitbucketServerModule };
