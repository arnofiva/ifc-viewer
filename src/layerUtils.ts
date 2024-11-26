import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import SceneLayer from "@arcgis/core/layers/SceneLayer";
import request from "@arcgis/core/request";

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

export async function downloadSourceModel(
  sourceLayer: SceneLayer,
  objectId: number,
): Promise<File> {
  const associatedLayer = (sourceLayer as any).associatedLayer as FeatureLayer;

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
  const files = await collectAssets(assetMaps);

  if (files.length === 1) {
    return files[0];
  } else {
    throw new Error("Received multiple assets");
  }
}

async function collectAssets(assetMaps: AssetMap[]): Promise<File[]> {
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
      return downloadAsset(
        parts[0].assetName,
        parts.map(({ assetURL }) => assetURL),
      );
    }),
  );
}

async function downloadAsset(
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
