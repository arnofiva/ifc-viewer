import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";
import { debounce } from "@arcgis/core/core/promiseUtils";
import { watch, when } from "@arcgis/core/core/reactiveUtils";
import { queryRooms, queryStats } from "../layers";
import IFCStore from "./IFCStore";

type IFCSpacesProperties = Pick<IFCSpaces, "layer">;

export type ModelView = "shell" | "entities" | "spaces";

@subclass()
class IFCSpaces extends IFCStore {
  @property()
  isLoadingStats = false;

  @property()
  stats: any[] = [];

  constructor(props: IFCSpacesProperties) {
    super(props);

    this.addHandles([
      when(
        () => this.layer,
        async (layer) => {
          queryRooms(layer);
          this.updateStats();
        },
      ),
      watch(
        () => this.currentLevel,
        async () => {
          this.updateStats();
        },
      ),
    ]);
  }

  private updateStats = debounce(async () => {
    this.isLoadingStats = true;

    this.stats = await queryStats(this.layer);
    console.log("Updated stats", { stats: this.stats });
    this.notifyChange("stats");
    this.isLoadingStats = false;
  });
}

export default IFCSpaces;
