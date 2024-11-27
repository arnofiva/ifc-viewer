import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";
import { Widget } from "./Widget";

import { tsx } from "@arcgis/core/widgets/support/widget";

import "@esri/calcite-components/dist/components/calcite-block";
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
          id="first-flow-item-block"
          heading="Display"
          open
          loading={isLoading}
        >
          {this.renderViewSelection()}
        </calcite-block>
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
}

export default ProjectPanel;
