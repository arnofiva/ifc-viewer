import { SpatialReference } from "@arcgis/core/geometry";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { SimpleRenderer } from "@arcgis/core/renderers";
import { FillSymbol3DLayer, MeshSymbol3D } from "@arcgis/core/symbols";

export type Level = {
  id: string;
  label: string;
  order: number;
};

export const entityLayer = new FeatureLayer({
  spatialReference: SpatialReference.WGS84,
  title: "IFC Entities",
  elevationInfo: { mode: "absolute-height", offset: 0 },
  objectIdField: "objectId",
  fields: [
    { name: "objectId", type: "oid" },
    {
      name: "expressID",
      type: "big-integer",
    },
    {
      name: "typeID",
      type: "big-integer",
    },
    { name: "typeName", type: "string" },
    { name: "longName", type: "string" },
    { name: "GFA", type: "double" },
    { name: "category", type: "string" },
    { name: "level", type: "string" },
  ],
  source: [],
  geometryType: "mesh",
  renderer: new SimpleRenderer({
    symbol: new MeshSymbol3D({
      symbolLayers: [
        new FillSymbol3DLayer({
          material: {
            color: [255, 255, 255],
          },
          // edges: new SolidEdges3D({
          //   color: [20, 20, 20],
          //   size: 0.8,
          // }),
        }),
      ],
    }),
  }),
});

function createLevel(id: string): Level {
  if (!id) {
    return {
      id: "<null>",
      order: 0,
      label: "Unknown",
    };
  } else if (id.match(/ground/i)) {
    return {
      id,
      order: 0,
      label: "Ground",
    };
  } else if (id.match(/roof/i)) {
    return {
      id,
      order: Number.MAX_SAFE_INTEGER,
      label: "Roof",
    };
  } else if (id.match(/parking/i)) {
    return {
      id,
      order: Number.MIN_SAFE_INTEGER,
      label: "Parking",
    };
  } else if (id.match(/base/i)) {
    return {
      id,
      order: Number.MIN_SAFE_INTEGER,
      label: "Basement",
    };
  }
  const numbers = id.match(/-?\d+/);
  if (numbers?.length) {
    const order = Number.parseInt(numbers[0]);
    return {
      id,
      order,
      label: `Level ${order}`,
    };
  }
  return {
    id,
    order: Number.MIN_SAFE_INTEGER,
    label: id,
  };
}

export async function queryLevels(layer: FeatureLayer) {
  const query = layer.createQuery();
  query.returnGeometry = false;
  query.outFields = ["level"];
  query.returnDistinctValues = true;
  const { features } = await layer.queryFeatures(query);

  const levels = features
    .map((f) => f.getAttribute("level") as string)
    .filter((level) => !!level)
    .map(createLevel);
  levels.sort((a, b) => b.order - a.order);
  return levels;
}
