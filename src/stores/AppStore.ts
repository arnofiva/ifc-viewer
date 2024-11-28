import WebScene from "@arcgis/core/WebScene";
import Accessor from "@arcgis/core/core/Accessor";
import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";
import { whenOnce } from "@arcgis/core/core/reactiveUtils";
import SceneLayer from "@arcgis/core/layers/SceneLayer";
import SceneView from "@arcgis/core/views/SceneView";
import { Project } from "../entities/Project";
import ProjectStore from "./ProjectStore";
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
  projects: Project[] = [];

  @property()
  projectStore: ProjectStore | null;

  constructor(props: AppStoreProperties) {
    super(props);

    whenOnce(() => this.map).then(async (map) => {
      await map.load();
      document.title = map.portalItem.title;

      await map.loadAll();

      this.projectsLayer = map.findLayerById(
        "19349f8476b-layer-0",
      ) as SceneLayer;

      this.projectsLayer.legendEnabled = false;

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

      this.projects = features.map((graphic) => new Project({ graphic }));
    }

    this.isLoadingProjects = false;
  }

  selectProject(project: Project) {
    const view = this.view;
    this.projectStore = new ProjectStore({ project, view });
  }

  deselectProject() {
    const store = this.projectStore;
    if (store) {
      store.destroy();
      this.projectStore = null;
    }
  }
}

export default AppStore;
