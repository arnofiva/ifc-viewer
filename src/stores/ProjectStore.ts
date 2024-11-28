import Accessor from "@arcgis/core/core/Accessor";
import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";
import { when } from "@arcgis/core/core/reactiveUtils";
import Graphic from "@arcgis/core/Graphic";
import SceneLayer from "@arcgis/core/layers/SceneLayer";
import { Project } from "../entities/Project";
import { closeModel, extractEntities, loadModel } from "../ifc";
import { entityLayer, Level, queryLevels } from "../layers";
import { downloadSourceModel } from "../layerUtils";

type ProjectStoreProperties = Pick<ProjectStore, "project">;

export type ModelView = "shell" | "entities" | "spaces";

@subclass()
class ProjectStore extends Accessor {
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
  selectedView: ModelView = "shell";

  @property()
  levels: Level[] = [];

  @property()
  currentLevel: string | null = null;

  constructor(props: ProjectStoreProperties) {
    super(props);

    this.addHandles(
      when(
        () => this.selectedView,
        async (view) => {
          if (view === "shell") {
            this.sourceLayer.visible = true;
            entityLayer.visible = false;
          } else {
            if (this.modelID === null) {
              await this.loadFile();
            }

            await this.extractEntities();
            this.sourceLayer.visible = false;
            entityLayer.visible = true;
          }
        },
      ),
    );
  }

  public filterByLevel(level: string | null = null) {
    if (level) {
      entityLayer.definitionExpression = `level in ('${level}')`;
    } else {
      entityLayer.definitionExpression = "";
    }
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

  private async extractEntities() {
    this.isLoadingEntities = true;

    const modelID = this.modelID;

    if (modelID !== null) {
      const meshes = await extractEntities(
        this.project,
        modelID,
        this.selectedView === "spaces",
      );
      await this.replaceEntities(meshes);
    }
    this.isLoadingEntities = false;
  }

  private async replaceEntities(entities: Graphic[]) {
    const query = entityLayer.createQuery();
    query.returnGeometry = false;
    query.outFields = [entityLayer.objectIdField];
    const { features } = await entityLayer.queryFeatures(query);

    this.levels = [];
    await entityLayer.applyEdits({
      deleteFeatures: features,
    });

    if (entities.length) {
      await entityLayer.applyEdits({
        addFeatures: entities,
      });
      this.levels = await queryLevels(entityLayer);
    }
  }

  private closeFile() {
    const modelID = this.modelID;
    if (modelID) {
      closeModel(modelID);
      this.modelID = null;
    }
  }

  destroy(): void {
    this.closeFile();
    this.replaceEntities([]);
    super.destroy();
  }
}

export default ProjectStore;
