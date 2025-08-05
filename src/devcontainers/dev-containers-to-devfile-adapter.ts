/**********************************************************************
 * Copyright (c) 2022-2024
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import yaml from 'js-yaml';

const DEFAULT_DEVFILE_CONTAINER_IMAGE = 'quay.io/devfile/universal-developer-image:ubi9-latest';
const DEFAULT_DEVFILE_NAME = 'default-devfile';
const DEFAULT_WORKSPACE_DIR = '/projects';

export function convertDevContainerToDevfile(devContainer: any): string {
  const devfile: any = {
    schemaVersion: '2.2.0',
    metadata: {
      name: (devContainer.name ?? DEFAULT_DEVFILE_NAME).toLowerCase().replace(/\s+/g, '-'),
      description: devContainer.description ?? '',
    },
    components: [],
    commands: [],
    events: {},
  };
  const workspaceFolder = devContainer.workspaceFolder ?? DEFAULT_WORKSPACE_DIR;

  const containerName = 'dev-container';
  const containerComponent: any = {
    name: containerName,
    container: {
      image: devContainer.image ?? DEFAULT_DEVFILE_CONTAINER_IMAGE,
    },
  };

  if (Array.isArray(devContainer.forwardPorts)) {
    containerComponent.container.endpoints = convertPortsToEndpoints(devContainer.forwardPorts);
  }

  const remoteEnvMap = convertToDevfileEnv(devContainer.remoteEnv);
  const containerEnvMap = convertToDevfileEnv(devContainer.containerEnv);
  const combinedEnvMap = new Map(remoteEnvMap);
  for (const [key, value] of containerEnvMap) {
    combinedEnvMap.set(key, value);
  }
  containerComponent.container.env = Array.from(combinedEnvMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  if (devContainer.overrideCommand) {
    containerComponent.container.command = ['/bin/bash'];
    containerComponent.container.args = ['-c', 'while true; do sleep 1000; done'];
  }

  devfile.commands.postStart = [];
  devfile.events.postStart = [];
  const postStartCommands: { key: keyof typeof devContainer; id: string }[] = [
    { key: 'onCreateCommand', id: 'on-create-command' },
    { key: 'updateContentCommand', id: 'update-content-command' },
    { key: 'postCreateCommand', id: 'post-create-command' },
    { key: 'postStartCommand', id: 'post-start-command' },
    { key: 'postAttachCommand', id: 'post-attach-command' },
  ];

  for (const { key, id } of postStartCommands) {
    const commandValue = devContainer[key];
    if (commandValue) {
      devfile.commands.push(createDevfileCommand(id, containerComponent.name, commandValue, workspaceFolder));
      devfile.events.postStart.push(id);
    }
  }

  if (devContainer.initializeCommand) {
    const commandId = 'initialize-command';
    devfile.commands.push(
      createDevfileCommand(commandId, containerComponent.name, devContainer.initializeCommand, workspaceFolder),
    );
    devfile.events.preStart = [commandId];
  }

  if (devContainer.hostRequirements) {
    if (devContainer.hostRequirements.cpus) {
      containerComponent.container.cpuRequest = devContainer.hostRequirements.cpus;
    }
    if (devContainer.hostRequirements.memory) {
      containerComponent.container.memoryRequest = convertMemoryToDevfileFormat(devContainer.hostRequirements.memory);
    }
  }

  if (devContainer.workspaceFolder) {
    containerComponent.container.mountSources = true;
    containerComponent.container.sourceMapping = devContainer.workspaceFolder;
  }

  const volumeComponents: any[] = [];
  const volumeMounts: any[] = [];
  if (devContainer.mounts) {
    devContainer.mounts.forEach((mount: string) => {
      const convertedDevfileVolume = createDevfileVolumeMount(mount);

      if (convertedDevfileVolume) {
        volumeComponents.push(convertedDevfileVolume.volumeComponent);
        volumeMounts.push(convertedDevfileVolume.volumeMount);
      }
    });
  }
  if (volumeMounts.length > 0) {
    containerComponent.container.volumeMounts = volumeMounts;
  }

  let imageComponent: any = null;
  if (devContainer.build) {
    imageComponent = createDevfileImageComponent(devContainer);
  }

  if (imageComponent) {
    devfile.components.push(imageComponent);
  } else {
    devfile.components.push(containerComponent);
  }
  devfile.components.push(...volumeComponents);

  return yaml.dump(devfile, { noRefs: true });
}

function convertMemoryToDevfileFormat(value: string): string {
  const unitMap: Record<string, string> = { tb: 'TiB', gb: 'GiB', mb: 'MiB', kb: 'KiB' };
  for (const [decUnit, binUnit] of Object.entries(unitMap)) {
    if (value.toLowerCase().endsWith(decUnit)) {
      value = value.toLowerCase().replace(decUnit, binUnit);
      break;
    }
  }
  return value;
}

function convertToDevfileEnv(envObject: Record<string, any> | undefined): Map<string, string> {
  const result = new Map<string, string>();

  if (!envObject || typeof envObject !== 'object') {
    return result;
  }

  for (const [key, value] of Object.entries(envObject)) {
    result.set(key, String(value));
  }

  return result;
}

function parsePortValue(port: number | string): number | null {
  if (typeof port === 'number') return port;

  // Example: "db:5432" => extract 5432
  const match = RegExp(/.*:(\d+)$/).exec(port);
  return match ? parseInt(match[1], 10) : null;
}

function convertPortsToEndpoints(ports: (number | string)[]): { name: string; targetPort: number }[] {
  return ports
    .map(port => {
      const targetPort = parsePortValue(port);
      if (targetPort === null) return null;

      let portName = `port-${targetPort}`;
      if (typeof port === 'string' && port.includes(':')) {
        portName = port.split(':')[0];
      }
      return { name: portName, targetPort };
    })
    .filter((ep): ep is { name: string; targetPort: number } => ep !== null);
}

function createDevfileCommand(
  id: string,
  component: string,
  commandLine: string | string[] | Record<string, any>,
  workingDir: string,
) {
  let resolvedCommandLine: string;
  if (typeof commandLine === 'string') {
    resolvedCommandLine = commandLine;
  } else if (Array.isArray(commandLine)) {
    resolvedCommandLine = commandLine.join(' ');
  } else if (typeof commandLine === 'object') {
    const values = Object.values(commandLine).map(v => {
      if (typeof v === 'string') {
        return v.trim();
      } else if (Array.isArray(v)) {
        return v.join(' ');
      }
    });
    resolvedCommandLine = values.join(' && ');
  }

  return {
    id: id,
    exec: {
      component: component,
      commandLine: resolvedCommandLine,
      workingDir: workingDir,
    },
  };
}

function createDevfileVolumeMount(mount: string) {
  // Format: source=devvolume,target=/data,type=volume
  const parts = Object.fromEntries(
    mount.split(',').map(segment => {
      const [key, val] = segment.split('=');
      return [key.trim(), val.trim()];
    }),
  );

  const { type, source, target } = parts;

  if (!source || !target || !type || type === 'bind') {
    return null;
  }

  const isEphemeral = type === 'tmpfs';

  return {
    volumeComponent: {
      name: source,
      volume: {
        ephemeral: isEphemeral,
      },
    },
    volumeMount: {
      name: source,
      path: target,
    },
  };
}

function createDevfileImageComponent(devcontainer: Record<string, any> | undefined) {
  let imageComponent = {
    imageName: '',
    dockerfile: {
      uri: '',
      buildContext: '',
      args: [],
    },
  };
  imageComponent.imageName = (devcontainer.name ?? 'default-devfile-image').toLowerCase().replace(/\s+/g, '-');
  if (devcontainer.build.dockerfile) {
    imageComponent.dockerfile.uri = devcontainer.build.dockerfile;
  }
  if (devcontainer.build.context) {
    imageComponent.dockerfile.buildContext = devcontainer.build.context;
  }
  if (devcontainer.build.args) {
    imageComponent.dockerfile.args = Object.entries(devcontainer.build.args).map(([key, value]) => `${key}=${value}`);
  }
  return imageComponent;
}
