import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";
import { Widget } from "./Widget";

import { tsx } from "@arcgis/core/widgets/support/widget";

import "@esri/calcite-components/dist/components/calcite-block";
import "@esri/calcite-components/dist/components/calcite-segmented-control";
import "@esri/calcite-components/dist/components/calcite-segmented-control-item";

import ProjectStore from "../stores/ProjectStore";

type ProjectPanelProperties = Pick<ProjectPanel, "store">;

@subclass()
class ProjectPanel extends Widget<ProjectPanelProperties> {
  @property()
  store: ProjectStore;

  constructor(props: ProjectPanelProperties) {
    super(props);
  }

  render() {
    const project = this.store.project;

    const name = project.name;
    const description = project.description;

    const isLoading = this.store.isLoading;

    return (
      <div>
        <calcite-block
          id="first-flow-item-block"
          heading="Display"
          open
          loading={isLoading}
        >
          <calcite-segmented-control width="full">
            <calcite-segmented-control-item value="3dobj" checked>
              Shell
            </calcite-segmented-control-item>
            <calcite-segmented-control-item value="ifc">
              Interior
            </calcite-segmented-control-item>
            <calcite-segmented-control-item value="ifcspaces">
              Spaces
            </calcite-segmented-control-item>
          </calcite-segmented-control>
        </calcite-block>
      </div>
    );
  }
}

export default ProjectPanel;
