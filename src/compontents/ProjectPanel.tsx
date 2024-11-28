import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";
import { Widget } from "./Widget";

import { tsx } from "@arcgis/core/widgets/support/widget";

import "@esri/calcite-components/dist/components/calcite-block";
import "@esri/calcite-components/dist/components/calcite-list";
import "@esri/calcite-components/dist/components/calcite-list-item";
import "@esri/calcite-components/dist/components/calcite-segmented-control";
import "@esri/calcite-components/dist/components/calcite-segmented-control-item";

import Legend from "@arcgis/core/widgets/Legend";
import ProjectStore, { ModelView } from "../stores/ProjectStore";

type ProjectPanelProperties = Pick<ProjectPanel, "store">;

@subclass()
class ProjectPanel extends Widget<ProjectPanelProperties> {
  @property()
  store: ProjectStore;

  constructor(props: ProjectPanelProperties) {
    super(props);
  }

  render() {
    return (
      <div>
        <calcite-block key="viewSelectionBlock" heading="Display" open>
          {this.renderViewSelection()}
        </calcite-block>

        {this.store.selectedView === "shell" ? [] : this.renderIFCBlocks()}

        <Legend view={this.store.view}></Legend>
      </div>
    );
  }

  private renderViewSelection() {
    const segments: { value: ModelView; label: string }[] = [
      {
        value: "shell",
        label: "Shell",
      },
      {
        value: "entities",
        label: "Interior",
      },
      {
        value: "spaces",
        label: "Spaces",
      },
    ];

    return (
      <calcite-segmented-control
        width="full"
        onCalciteSegmentedControlChange={(e: any) => {
          if (e.target.value === "shell") {
            this.store.selectShell();
          } else if (e.target.value === "entities") {
            this.store.selectEntities();
          } else {
            this.store.selectSpaces();
          }
        }}
      >
        {segments.map((s) => (
          <calcite-segmented-control-item
            value={s.value}
            checked={s.value === this.store.selectedView}
          >
            {s.label}
          </calcite-segmented-control-item>
        ))}
      </calcite-segmented-control>
    );
  }

  private renderIFCBlocks() {
    const ifcStore = this.store.selectedStore;

    if (!ifcStore) {
      return;
    }

    return (
      <calcite-block key="viewSelectionBlock" heading="Levels" open>
        <calcite-list
          selection-appearance="border"
          // selection-mode="single-persis"
          selection-mode="single"
          onCalciteListChange={(e: any) => {
            const items = e.target.selectedItems;
            const value = items && items.length ? items[0].value : null;
            ifcStore.filterByLevel(value);
          }}
        >
          {ifcStore.levels.map((level, index) => (
            <calcite-list-item
              key={`level-${index}`}
              label={level.label}
              description={level.id !== level.label ? level.id : null}
              value={level.id}
            ></calcite-list-item>
          ))}
        </calcite-list>
      </calcite-block>
    );
  }
}

export default ProjectPanel;
