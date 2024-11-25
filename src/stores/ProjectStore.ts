import Graphic from "@arcgis/core/Graphic";
import Accessor from "@arcgis/core/core/Accessor";
import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";
import { whenOnce } from "@arcgis/core/core/reactiveUtils";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import SceneLayer from "@arcgis/core/layers/SceneLayer";
import request from "@arcgis/core/request";
import { Project } from "../entities/Project";
import { closeModel, extractEntities, loadModel } from "../ifc";
import { entityLayer } from "../layers";

type ProjectStoreProperties = Pick<ProjectStore, "project">;

interface AssetMap {
  globalId: string;
  parentGlobalId: string;
  assetName: string;
  assetHash: string;
  assetType: string;
  flags: string[];
  conversionStatus: string;
  size: number;
  complexity: number;
  sourceHash: string;
  assetURL: string;
  seqNo: number;
}

@subclass()
class ProjectStore extends Accessor {
  @property({ constructOnly: true })
  project: Project;

  @property()
  get isLoading() {
    return this.isLoadingFile || this.isLoadingEntities;
  }

  @property()
  isLoadingFile = true;

  @property()
  isLoadingEntities = false;

  @property()
  modelID: number | null = null;

  constructor(props: ProjectStoreProperties) {
    super(props);

    whenOnce(() => this.project).then(async () => {
      this.loadFile();
    });
  }

  private async loadFile() {
    this.isLoadingFile = true;

    const sourceLayer = this.project.graphic.layer as SceneLayer;
    const associatedLayer = (sourceLayer as any)
      .associatedLayer as FeatureLayer;
    const file = await this.downloadSource(
      associatedLayer,
      this.project.graphic.getObjectId(),
    );

    this.modelID = await loadModel(file);

    this.isLoadingFile = false;

    await this.extractEntities();
  }

  private async downloadSource(
    associatedLayer: FeatureLayer,
    objectId: number,
  ): Promise<File> {
    const assetTypeField = (associatedLayer as any).infoFor3D.assetTypeField;

    const { features } = (
      await request(`${associatedLayer.url}/${associatedLayer.layerId}/query`, {
        query: {
          objectIds: [objectId],
          outFields: [associatedLayer.objectIdField, assetTypeField],
          f: "json",
        },
      })
    ).data;

    const feature = features[0];

    const ret = await request(
      `${associatedLayer.url}/${associatedLayer.layerId}/query3d`,
      {
        query: {
          formatOf3DObjects: feature.attributes[assetTypeField],
          objectIds: [feature.attributes[associatedLayer.objectIdField]],
          f: "json",
        },
      },
    );
    const assetMaps = ret.data.assetMaps as AssetMap[];
    const files = await this.collectAssets(assetMaps);

    if (files.length === 1) {
      return files[0];
    } else {
      throw new Error("Received multiple assets");
    }
  }

  private async collectAssets(assetMaps: AssetMap[]): Promise<File[]> {
    const fileParts = new Map<string, AssetMap[]>();

    for (const assetMap of assetMaps) {
      let parts = fileParts.get(assetMap.assetName);

      if (!parts) {
        parts = [];
        fileParts.set(assetMap.assetName, parts);
      }

      parts.push(assetMap);
    }

    return Promise.all(
      Array.from(fileParts.keys()).map((key) => {
        const parts = fileParts.get(key)!;
        parts.sort((a, b) => a.seqNo - b.seqNo);
        return this.downloadAsset(
          parts[0].assetName,
          parts.map(({ assetURL }) => assetURL),
        );
      }),
    );
  }

  private async downloadAsset(
    filename: string,
    partUrls: string[],
  ): Promise<File> {
    const blobs = await Promise.all(
      partUrls.map(
        async (url) =>
          (await request(url, { responseType: "blob" })).data as Blob,
      ),
    );
    return new File(blobs, filename);
  }

  private async extractEntities() {
    this.isLoadingEntities = true;

    const modelID = this.modelID;

    if (modelID !== null) {
      const meshes = await extractEntities(modelID, true);
      await this.replaceEntities(meshes);
    }
    this.isLoadingEntities = false;
  }

  private async replaceEntities(entities: Graphic[]) {
    const query = entityLayer.createQuery();
    query.returnGeometry = false;
    query.outFields = [entityLayer.objectIdField];
    const { features } = await entityLayer.queryFeatures(query);

    await entityLayer.applyEdits({
      deleteFeatures: features,
    });

    if (entities.length) {
      await entityLayer.applyEdits({
        addFeatures: entities,
      });
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
