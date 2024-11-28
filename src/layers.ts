import { SpatialReference } from "@arcgis/core/geometry";
import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { SimpleRenderer, UniqueValueRenderer } from "@arcgis/core/renderers";
import OpacityVariable from "@arcgis/core/renderers/visualVariables/OpacityVariable";
import { FillSymbol3DLayer, MeshSymbol3D } from "@arcgis/core/symbols";
import SolidEdges3D from "@arcgis/core/symbols/edges/SolidEdges3D";

export type Level = {
  id: string;
  label: string;
  order: number;
};

export function createEntityLayer(source: Graphic[]) {
  return new FeatureLayer({
    spatialReference: SpatialReference.WGS84,
    title: "Entities",
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
    source,
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
}

const SPACE_USE_TYPES = ["Office", "Residential", "Commercial", "Common Space"];

const COLORS = ["#ed5151ff", "#149eceff", "#a7c636ff", "#9e559c"];

export function createSpacesLayer(source: Graphic[]) {
  return new FeatureLayer({
    spatialReference: SpatialReference.WGS84,
    title: "Spaces",
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
      { name: "NFA", type: "double" },
      { name: "category", type: "string" },
      { name: "level", type: "string" },
      { name: "weatherExposure", type: "string" },
      { name: "spaceUseType", type: "string" },
    ],
    source,
    geometryType: "mesh",
    renderer: new UniqueValueRenderer({
      field: "category",
      valueExpression:
        "When(Equals($feature.category, 'Areas'), '__area__', $feature.spaceUseType)",
      // field2: "longName",
      defaultLabel: "Other",
      defaultSymbol: new MeshSymbol3D({
        symbolLayers: [
          new FillSymbol3DLayer({
            material: {
              color: "#7f7f7fff",
            },
            // edges: new SolidEdges3D({
            //   color: [20, 20, 20],
            //   size: 0.8,
            // }),
          }),
        ],
      }),
      visualVariables: [
        new OpacityVariable({
          field: "weatherExposure",
          valueExpression:
            "When(Equals($feature.weatherExposure, 'Exterior'),50,100)",
          stops: [
            { value: 50, opacity: 0.2 },
            { value: 100, opacity: 1 },
          ],
        }),
      ],
      uniqueValueInfos: [
        {
          value: "__area__",
          label: "Area",
          symbol: new MeshSymbol3D({
            symbolLayers: [
              new FillSymbol3DLayer({
                material: {
                  color: [255, 255, 255, 0],
                },
                edges: new SolidEdges3D({
                  color: [20, 20, 20],
                  size: 1.5,
                }),
                castShadows: false,
                // edges: new SolidEdges3D({
                //   color: [20, 20, 20],
                //   size: 0.8,
                // }),
              }),
            ],
          }),
        },
        ...SPACE_USE_TYPES.map((spaceUseType, index) => ({
          value: spaceUseType,
          label: spaceUseType,
          symbol: new MeshSymbol3D({
            symbolLayers: [
              new FillSymbol3DLayer({
                material: {
                  color: COLORS[index],
                },
                // edges: new SolidEdges3D({
                //   color: [20, 20, 20],
                //   size: 0.8,
                // }),
              }),
            ],
          }),
        })),
      ],
    }),
  });
}

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

export async function queryRooms(layer: FeatureLayer) {
  const query = layer.createQuery();
  query.returnGeometry = false;
  query.outFields = ["spaceUseType"];
  query.returnDistinctValues = true;
  const { features } = await layer.queryFeatures(query);

  const rooms = features.map((f) => f.getAttribute("spaceUseType") as string);
  console.log({ rooms });
}
