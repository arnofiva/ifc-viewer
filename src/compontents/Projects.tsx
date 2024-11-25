import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";
import AppStore from "../stores/AppStore";
import { Widget } from "./Widget";

import { tsx } from "@arcgis/core/widgets/support/widget";

import "@esri/calcite-components/dist/components/calcite-action";
import "@esri/calcite-components/dist/components/calcite-button";
import "@esri/calcite-components/dist/components/calcite-menu";
import "@esri/calcite-components/dist/components/calcite-menu-item";
import "@esri/calcite-components/dist/components/calcite-navigation";
import "@esri/calcite-components/dist/components/calcite-navigation-logo";
import "@esri/calcite-components/dist/components/calcite-navigation-user";

type ProjectsProperties = Pick<Projects, "store">;

@subclass()
class Projects extends Widget<ProjectsProperties> {
  @property()
  store: AppStore;

  constructor(props: ProjectsProperties) {
    super(props);
  }

  render() {
    const isLoading = this.store.isLoadingProjects;
    const projects = this.store.projects;
    const description = isLoading ? "" : `${projects.length} Projects`;

    return (
      <div>
        <calcite-block
          id="first-flow-item-block"
          heading="Projects"
          description={description}
          open
          loading={isLoading}
        >
          <calcite-card-group label="Projects" selection-mode="none">
            {projects.map((project) => {
              const projectId = `project-${project.graphic.getObjectId()}`;
              return (
                <calcite-card
                  class="project-card"
                  key={projectId}
                  onclick={() => this.store.selectProject(project)}
                >
                  <span slot="heading">{project.name}</span>
                  <span slot="description">{project.description}</span>
                  <span slot="description">{project.location}</span>
                  <div slot="footer-start">
                    <calcite-chip value="calcite chip" kind="neutral" scale="s">
                      {this.getModelType(project.format)}
                    </calcite-chip>
                  </div>
                  <div slot="footer-end">
                    <calcite-chip
                      id={`${projectId}-user-badge`}
                      value="calcite chip"
                      icon="user"
                      scale="s"
                    ></calcite-chip>
                  </div>
                  {/* <div slot="footer-end">
                      <calcite-chip value="calcite chip" icon="walking">
                        Recreation
                      </calcite-chip>
                    </div> */}
                  <calcite-tooltip
                    reference-element={`${projectId}-user-badge`}
                    placement="top"
                  >
                    Uploaded by {project.creator}
                  </calcite-tooltip>
                </calcite-card>
              );
            })}
          </calcite-card-group>
        </calcite-block>
      </div>
    );
  }

  private getModelType(type: string) {
    switch (type) {
      case "3D_ifc":
        return "IFC";
      default:
        return "other";
    }
  }
}

export default Projects;
