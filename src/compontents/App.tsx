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
import Projects from "./Projects";

type AppProperties = Pick<App, "store">;

@subclass("arcgis-core-template.App")
class App extends Widget<AppProperties> {
  @property()
  store: AppStore;

  postInitialize(): void {
    const view = this.store.view;
    const fullscreen = new Fullscreen({ view });
    view.ui.add(fullscreen, "top-right");

    view.ui.add(new LayerList({ view }), "bottom-right");

    view.ui.add(
      new Expand({
        group: "tools",
        view,
        content: new Slice({ view }),
      }),
      "top-right",
    );
  }

  appendView(div: HTMLElement): void {
    div.appendChild(this.store.view.container);
  }

  render() {
    return (
      <div>
        <calcite-shell>
          <Header store={this.store}></Header>

          <calcite-shell-panel slot="panel-start" position="start">
            <calcite-flow id="example-flow">
              <calcite-flow-item>
                <Projects store={this.store}></Projects>

                {/* <calcite-block
                  id="first-flow-item-block"
                  heading="Recommended for you"
                  description="4 results"
                  open
                >
                  <calcite-list>
                    <calcite-list-item
                      label="Narnia Community College"
                      description="Wardobe, IA"
                    ></calcite-list-item>
                    <calcite-list-item
                      label="University of Acme"
                      description="Acmeton, CA"
                    ></calcite-list-item>
                    <calcite-list-item
                      label="Roadrunner Trade School"
                      description="Zion, UT"
                    ></calcite-list-item>
                    <calcite-list-item
                      label="Cartographic Institute"
                      description="Redlands, CA"
                    ></calcite-list-item>
                  </calcite-list>
                </calcite-block> */}
              </calcite-flow-item>
            </calcite-flow>
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
