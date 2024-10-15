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

import * as jsYaml from 'js-yaml';

import { Container } from 'inversify';
import { EditorResolver } from '../../src/editor/editor-resolver';
import { UrlFetcher } from '../../src/fetch/url-fetcher';

describe('Test EditorResolver', () => {
  let container: Container;

  const originalConsoleError = console.error;
  const mockedConsoleError = jest.fn();

  const urlFetcherFetchTextMock = jest.fn();
  const urlFetcherFetchTextOptionalMock = jest.fn();
  const urlFetcher = {
    fetchText: urlFetcherFetchTextMock,
    fetchTextOptionalContent: urlFetcherFetchTextOptionalMock,
  } as any;

  let editorResolver: EditorResolver;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    container = new Container();
    container.bind(EditorResolver).toSelf().inSingletonScope();
    container.bind(UrlFetcher).toConstantValue(urlFetcher);
    editorResolver = container.get(EditorResolver);
    console.error = mockedConsoleError;
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  test('basic loadEditor', async () => {
    const myId = 'http://editor.yaml';
    const dummy = { dummyContent: 'dummy' };
    urlFetcherFetchTextMock.mockResolvedValue(jsYaml.dump(dummy));
    const content = await editorResolver.loadEditor(myId);
    expect(urlFetcherFetchTextMock).toBeCalledWith('http://editor.yaml');
    expect(content).toStrictEqual(dummy);
  });
});
