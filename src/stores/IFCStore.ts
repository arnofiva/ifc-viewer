import Accessor from "@arcgis/core/core/Accessor";
import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";
import { when } from "@arcgis/core/core/reactiveUtils";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { Level, queryLevels, queryRooms } from "../layers";

type IFCStoreProperties = Pick<IFCStore, "layer">;

export type ModelView = "shell" | "entities" | "spaces";

@subclass()
class IFCStore extends Accessor {
  @property()
  layer: FeatureLayer;

  @property()
  isLoadingLevels = false;

  @property()
  levels: Level[] = [];

  @property()
  currentLevel: string | null = null;

  constructor(props: IFCStoreProperties) {
    super(props);

    this.addHandles(
      when(
        () => this.layer,
        async (layer) => {
          this.levels = await queryLevels(layer);

          queryRooms(layer);
        },
      ),
    );
  }

  public filterByLevel(level: string | null = null) {
    if (this.layer) {
      if (level) {
        this.layer.definitionExpression = `level in ('${level}')`;
      } else {
        this.layer.definitionExpression = "";
      }
    }
  }

  public reset() {
    this.layer.visible = true;
    this.filterByLevel();
  }

  destroy(): void {
    this.layer.destroy();
  }
}

export default IFCStore;
