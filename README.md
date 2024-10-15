## DevWorkspace Generator
[![Contribute](https://www.eclipse.org/che/contribute.svg)](https://workspaces.openshift.com#https://github.com/devfile/devworkspace-generator)
[![Contribute (nightly)](https://img.shields.io/static/v1?label=nightly%20Che&message=for%20maintainers&logo=eclipseche&color=FDB940&labelColor=525C86)](https://che-dogfooding.apps.che-dev.x6e0.p1.openshiftapps.com#https://github.com/devfile/devworkspace-generator)

The library is used by Eclipse Che to generate DevWorkspace components and templates. It requires both the original devfile.yaml and the editor definitions.

## Where is it Published?
This library is available on npm.

You can find the published package here: \
__npm:__ [@eclipse-che/che-devworkspace-generator](https://www.npmjs.com/package/@eclipse-che/che-devworkspace-generator)

## Usage

### Here’s an example of how to use the @eclipse-che/che-devworkspace-generator library to generate a DevWorkspace and DevWorkspaceTemplate:

```typescript
import { Main as DevworkspaceGenerator } from '@eclipse-che/che-devworkspace-generator/lib/main';
import { V1alpha2DevWorkspaceTemplate } from '@devfile/api';
import { dump } from 'js-yaml';

// Initialize the DevWorkspace generator
const generator = new DevworkspaceGenerator();

// Example function to generate DevWorkspace resources
async function generateDevWorkspace(devfileContent: string, editorContent: string, axiosInstance: any) {
  // Generate the Devfile context
  const context = await generator.generateDevfileContext(
    {
      devfileContent,
      editorContent,
      projects: [],
    },
    axiosInstance,
  );

  // Convert templates and DevWorkspace to YAML
  const allContentArray = context.devWorkspaceTemplates.map(
    (template: V1alpha2DevWorkspaceTemplate) => dump(template),
  );
  allContentArray.push(dump(context.devWorkspace));

  // Return the YAML content joined by "---"
  return allContentArray.join('---\n');
}
```

### The library can be used as a standalone library:

```
USAGE
    $ node lib/entrypoint.js [OPTIONS]

OPTIONS
      --devfile-url:           URL to the git repository that contains devfile.yaml
            or
      --devfile-path:          path to the devfile.yaml file

      --editor-url:            URL for the editor's definition, should be publicly accessible for download.
            or
      --editor-path:           local file path of the editor devfile.yaml
            or
      --editor-content:        content of the editor devfile.yaml

      --output-file:           local file path for the generated devworkspace yaml 

      --project.<project-name> local file path for the sample project zip (for airgapped/offline registry builds)

      --injectDefaultComponent: inject a default dev container component if no component is defined in the devfile and it doesn't provide a parent, the value can be true or false, default is false

      --defaultComponentImage: image to use for the default dev container component that will be injected if no componetn is defined in the devfile and it doesn't provide a parent devfile, default is quay.io/devfile/universal-developer-image:ubi8-latest

EXAMPLES

    # online example, using editor definition from https://raw.githubusercontent.com/eclipse-che/che-operator/refs/heads/main/editors-definitions/che-code-insiders.yaml

    $ node lib/entrypoint.js \
        --devfile-url:https://github.com/che-samples/java-spring-petclinic/tree/main \
        --editor-url:https://raw.githubusercontent.com/eclipse-che/che-operator/refs/heads/main/editors-definitions/che-code-insiders.yaml \
        --output-file:/tmp/devworkspace-che-code-latest.yaml \
        --injectDefaultComponent:true \
        --defaultComponentImage:registry.access.redhat.com/ubi8/openjdk-11:latest

    # offline example with devfile.yaml files and zipped project available locally

    $ node lib/entrypoint.js \
        --devfile-path:/remote-source/python-hello-world/app/devfile.yaml \
        --editor-path:/build/plugins/che-incubator/che-code/latest/devfile.yaml \
        --output-file:./devfiles/python__python-hello-world/devworkspace-che-code-latest.yaml \
        --project.python-hello-world='{{_INTERNAL_URL_}}/resources/v2/python-hello-world.zip'

```

The output file `devworkspace-che-code-latest.yaml` contains a DevWorkspace based on the repository devfile and a Che-Code DevWorkspaceTemplate.

If the DevWorkspace engine is installed on the cluster, the following command will create a DevWorkspace:

`$ kubectl apply -f /tmp/devworkspace-che-code-latest.yaml`
