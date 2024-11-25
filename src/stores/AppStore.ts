import Graphic from "@arcgis/core/Graphic";
import WebScene from "@arcgis/core/WebScene";
import Accessor from "@arcgis/core/core/Accessor";
import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";
import { whenOnce } from "@arcgis/core/core/reactiveUtils";
import SceneLayer from "@arcgis/core/layers/SceneLayer";
import SceneView from "@arcgis/core/views/SceneView";
import UserStore from "./UserStore";

type AppStoreProperties = Pick<AppStore, "view">;

@subclass("arcgis-core-template.AppStore")
class AppStore extends Accessor {
  @property({ aliasOf: "view.map" })
  map: WebScene;

  @property({ constructOnly: true })
  view: SceneView;

  @property({ constructOnly: true })
  userStore = new UserStore();

  @property()
  private projectsLayer: SceneLayer | undefined;

  @property()
  isLoadingProjects = true;

  @property()
  projects: Graphic[] = [];

  constructor(props: AppStoreProperties) {
    super(props);

    whenOnce(() => this.map).then(async (map) => {
      await map.load();
      document.title = map.portalItem.title;

      await map.loadAll();

      this.projectsLayer = map.allLayers.find(
        ({ title }) => title === "Projects",
      ) as SceneLayer;

      this.loadProjects();
    });
  }

  private async loadProjects() {
    this.isLoadingProjects = true;

    const layer = this.projectsLayer;
    if (layer) {
      const query = layer.createQuery();
      query.returnGeometry = false;
      query.outFields = ["*"];

      const { features } = await layer.queryFeatures(query);

      this.projects = features;
    }

    this.isLoadingProjects = false;
  }
}

export default AppStore;
