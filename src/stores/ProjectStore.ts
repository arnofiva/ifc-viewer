import Accessor from "@arcgis/core/core/Accessor";
import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";
import { debounce } from "@arcgis/core/core/promiseUtils";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import SceneLayer from "@arcgis/core/layers/SceneLayer";
import SceneView from "@arcgis/core/views/SceneView";
import WebScene from "@arcgis/core/WebScene";
import { Project } from "../entities/Project";
import { closeModel, extractEntities, loadModel } from "../ifc";
import { createEntityLayer, createSpacesLayer } from "../layers";
import { downloadSourceModel } from "../layerUtils";
import IFCStore from "./IFCStore";

type ProjectStoreProperties = Pick<ProjectStore, "project" | "view">;

export type ModelView = "shell" | "entities" | "spaces";

@subclass()
class ProjectStore extends Accessor {
  @property({ aliasOf: "view.map" })
  map: WebScene;

  @property({ constructOnly: true })
  view: SceneView;

  @property({ constructOnly: true })
  project: Project;

  @property({ readOnly: true, aliasOf: "project.graphic.layer" })
  sourceLayer: SceneLayer;

  @property()
  get isLoading() {
    return this.isLoadingFile || this.isLoadingEntities;
  }

  @property()
  isLoadingFile = false;

  @property()
  isLoadingEntities = false;

  @property()
  modelID: number | null = null;

  @property()
  get selectedView(): ModelView {
    if (this.entities && this.selectedStore === this.entities) {
      return "entities";
    } else if (this.spaces && this.selectedStore === this.spaces) {
      return "spaces";
    } else {
      return "shell";
    }
  }

  @property()
  get selectedStore() {
    return this._selectedStore;
  }
  private set selectedStore(store: IFCStore | null) {
    if (store === this._selectedStore) {
      return;
    }

    this._selectedStore = store;
    if (store) {
      store.reset();
      this.sourceLayer.visible = false;
    } else {
      this.sourceLayer.visible = true;
    }
  }

  @property()
  private _selectedStore: IFCStore | null = null;

  @property()
  private entities: IFCStore | null = null;

  @property()
  private spaces: IFCStore | null = null;

  @property({ readOnly: true })
  groupLayer = new GroupLayer({
    title: "IFC Model",
    visibilityMode: "exclusive",
  });

  constructor(props: ProjectStoreProperties) {
    super(props);
  }

  async selectShell() {
    this._selectedStore = null;
    this.sourceLayer.visible = true;
    this.groupLayer.visible = false;
  }

  async selectEntities() {
    if (!this.entities) {
      this.entities = await this.initIFCStore(false);
    }

    this.selectedStore = this.entities;
  }

  async selectSpaces() {
    if (!this.spaces) {
      this.spaces = await this.initIFCStore(true);
    }

    this.selectedStore = this.spaces;
  }

  private async loadFile() {
    this.isLoadingFile = true;

    const sourceLayer = this.sourceLayer;
    const file = await downloadSourceModel(
      sourceLayer,
      this.project.graphic.getObjectId(),
    );

    this.modelID = await loadModel(file);

    this.isLoadingFile = false;
  }

  private initIFCStore = debounce(async (spaces: boolean) => {
    this.isLoadingEntities = true;

    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });

    if (this.modelID === null) {
      await this.loadFile();
      if (this.modelID === null) {
        return null;
      }
    }

    const modelID = this.modelID;
    let store: IFCStore;

    this.map.add(this.groupLayer);

    if (spaces) {
      const meshes = await extractEntities(this.project, modelID, true);
      this.spaces = store = new IFCStore({
        layer: createSpacesLayer(meshes),
      });
    } else {
      const meshes = await extractEntities(this.project, modelID, false);
      this.entities = store = new IFCStore({
        layer: createEntityLayer(meshes),
      });
    }

    this.groupLayer.add(store.layer);
    this.isLoadingEntities = false;

    return store;
  });

  private closeFile() {
    const modelID = this.modelID;
    if (modelID) {
      closeModel(modelID);
      this.modelID = null;
    }
    this.map.remove(this.groupLayer);
    this.groupLayer.destroy();
  }

  destroy(): void {
    this.closeFile();
    super.destroy();
  }
}

export default ProjectStore;
