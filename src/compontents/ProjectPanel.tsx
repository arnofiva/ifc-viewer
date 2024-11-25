import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";
import { Widget } from "./Widget";

import { tsx } from "@arcgis/core/widgets/support/widget";

import "@esri/calcite-components/dist/components/calcite-action";
import "@esri/calcite-components/dist/components/calcite-button";
import "@esri/calcite-components/dist/components/calcite-menu";
import "@esri/calcite-components/dist/components/calcite-menu-item";
import "@esri/calcite-components/dist/components/calcite-navigation";
import "@esri/calcite-components/dist/components/calcite-navigation-logo";
import "@esri/calcite-components/dist/components/calcite-navigation-user";
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
          heading={name}
          description={description}
          open
          loading={isLoading}
        ></calcite-block>
      </div>
    );
  }
}

export default ProjectPanel;
