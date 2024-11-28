import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";

import { tsx } from "@arcgis/core/widgets/support/widget";

import Expand from "@arcgis/core/widgets/Expand";
import Fullscreen from "@arcgis/core/widgets/Fullscreen";
import LayerList from "@arcgis/core/widgets/LayerList";
import Slice from "@arcgis/core/widgets/Slice";
import AppStore from "../stores/AppStore";
import Header from "./Header";
import { Widget } from "./Widget";

import { watch } from "@arcgis/core/core/reactiveUtils";
import "@esri/calcite-components/dist/components/calcite-block";
import "@esri/calcite-components/dist/components/calcite-card";
import "@esri/calcite-components/dist/components/calcite-card-group";
import "@esri/calcite-components/dist/components/calcite-chip";
import "@esri/calcite-components/dist/components/calcite-flow";
import "@esri/calcite-components/dist/components/calcite-flow-item";
import "@esri/calcite-components/dist/components/calcite-list";
import "@esri/calcite-components/dist/components/calcite-list-item";
import "@esri/calcite-components/dist/components/calcite-shell";
import "@esri/calcite-components/dist/components/calcite-shell-panel";
import ProjectPanel from "./ProjectPanel";
import Projects from "./Projects";

type AppProperties = Pick<App, "store">;

@subclass("arcgis-core-template.App")
class App extends Widget<AppProperties> {
  @property()
  store: AppStore;

  postInitialize(): void {
    const view = this.store.view;
    const fullscreen = new Fullscreen({ view });
    view.ui.add(fullscreen, "top-left");

    view.ui.add(new LayerList({ view, collapsed: true }), "top-right");

    const slice = new Slice({ view });

    const sliceExpand = new Expand({
      group: "tools",
      view,
      content: slice,
    });

    view.ui.add(sliceExpand, "top-right");

    watch(
      () => sliceExpand.expanded,
      (expanded) => {
        if (expanded) {
          slice.viewModel.start();
        } else {
          slice.viewModel.clear();
        }
      },
    );
  }

  appendView(div: HTMLElement): void {
    div.appendChild(this.store.view.container);
  }

  render() {
    const projectStore = this.store.projectStore;

    const flows = [
      <calcite-flow-item key="projects" loading={this.store.isLoadingProjects}>
        <Projects store={this.store}></Projects>
      </calcite-flow-item>,
    ];

    if (projectStore) {
      flows.push(
        <calcite-flow-item
          key="selected-project"
          beforeBack={() => this.store.deselectProject()}
          heading={projectStore.project.name}
          description={projectStore.project.location}
          loading={projectStore.isLoading}
        >
          <ProjectPanel store={projectStore}></ProjectPanel>
        </calcite-flow-item>,
      );
    }

    const flow = <div></div>;

    return (
      <div>
        <calcite-shell>
          <Header store={this.store}></Header>

          <calcite-shell-panel slot="panel-start" position="start">
            <calcite-flow id="project-flow">{flows}</calcite-flow>
          </calcite-shell-panel>

          <calcite-panel
            afterCreate={(e: HTMLElement) => this.appendView(e)}
          ></calcite-panel>
        </calcite-shell>
      </div>
    );
  }
}

export default App;
