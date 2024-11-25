import { SpatialReference } from "@arcgis/core/geometry";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { SimpleRenderer } from "@arcgis/core/renderers";
import { FillSymbol3DLayer, MeshSymbol3D } from "@arcgis/core/symbols";

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
