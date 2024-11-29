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

import { when } from "@arcgis/core/core/reactiveUtils";
import ProjectStore from "../stores/ProjectStore";

import Chart from "chart.js";
import IFCSpaces from "../stores/IFCSpaces";

type SpacesChartsProperties = Pick<SpacesCharts, "store" | "spacesStore">;

@subclass()
class SpacesCharts extends Widget<SpacesChartsProperties> {
  @property()
  store: ProjectStore;

  @property()
  spacesStore: IFCSpaces;

  @property()
  chart: Chart;

  @property()
  netArea: number;

  @property()
  gfaArea: number;

  constructor(props: SpacesChartsProperties) {
    super(props);

    this.addHandles(
      when(
        () => this.spacesStore && this.spacesStore.stats,
        (stats) => {
          const builtArea = stats.find(
            (stat) =>
              stat.category === "Areas" && stat.spaceUseType === "Built",
          );
          this.netArea = builtArea ? (builtArea.nfaSum as number) : 0;

          const computedArea = stats.find(
            (stat) =>
              stat.category === "Areas" && stat.spaceUseType === "Computed",
          );
          this.gfaArea = computedArea ? (computedArea.nfaSum as number) : 0;

          if (this.chart && this.chart.data.datasets?.length) {
            const data = [0, 0, 0, 0, 0];
            stats.forEach((stat) => {
              if (stat.category !== "Areas") {
                let index = 4;
                switch (stat.spaceUseType) {
                  case "Office":
                    index = 0;
                    break;
                  case "Residential":
                    index = 1;
                    break;
                  case "Commercial":
                    index = 2;
                    break;
                  case "Common Space":
                    index = 3;
                    break;
                }
                data[index] += stat.nfaSum;
              }
            });

            // const stats = props.spacesStore.stats;
            this.chart.data.datasets[0].data = data;
            this.chart.update();
          }
        },
        { initial: true },
      ),
    );
  }

  private createChart(element: HTMLCanvasElement) {
    this.chart = new Chart(element.getContext("2d")!, {
      type: "doughnut",
      data: {
        labels: [
          "Office",
          "Residential",
          "Commercial",
          "Common Space",
          "Other",
        ],
        datasets: [
          {
            backgroundColor: [
              "#ed5151ff",
              "#149eceff",
              "#a7c636ff",
              "#9e559c",
              "#7f7f7f",
            ],
            borderWidth: 0,
            data: [0, 0, 0, 0, 0],
          },
        ],
      },
      options: {
        responsive: false,
        cutoutPercentage: 35,
        legend: {
          position: "bottom",
        },
        title: {
          display: false,
          text: "Area per space usage",
        },
      },
    });
  }

  render() {
    return (
      <div>
        <calcite-block key="viewSelectionBlock" open>
          <p>
            <span class="area-label">Built area</span>
            <br />
            <h1>{this.netArea.toFixed(2)}m2</h1>
          </p>

          <p>
            <span class="area-label">Usable area (GFA)</span>
            <br />
            <h1>{this.gfaArea.toFixed(2)}m2</h1>
          </p>

          <div class="charts">
            <div>
              <canvas
                afterCreate={(e: HTMLCanvasElement) => this.createChart(e)}
                id="spaceTypeChart"
                width="250"
                height="300"
              />
            </div>
          </div>
        </calcite-block>
      </div>
    );
  }
}

export default SpacesCharts;
