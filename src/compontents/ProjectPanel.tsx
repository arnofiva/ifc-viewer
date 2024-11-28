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
    const isLoading = this.store.isLoading;

    return (
      <div>
        <calcite-block
          key="viewSelectionBlock"
          heading="Display"
          open
          loading={isLoading}
        >
          {this.renderViewSelection()}
        </calcite-block>

        {this.store.selectedView === "shell" ? [] : this.renderIFCBlocks()}
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
        onCalciteSegmentedControlChange={(e: any) =>
          (this.store.selectedView = e.target.value)
        }
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
    return (
      <calcite-block key="viewSelectionBlock" heading="Levels" open>
        <calcite-list
          selection-appearance="border"
          // selection-mode="single-persis"
          selection-mode="single"
          onCalciteListChange={(e: any) => {
            const items = e.target.selectedItems;
            const value = items && items.length ? items[0].value : null;
            this.store.filterByLevel(value);
          }}
        >
          {this.store.levels.map((level, index) => (
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
