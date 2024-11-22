import Graphic from "@arcgis/core/Graphic";
import WebScene from "@arcgis/core/WebScene";
import { SpatialReference } from "@arcgis/core/geometry";
import Mesh from "@arcgis/core/geometry/Mesh";
import MeshComponent from "@arcgis/core/geometry/support/MeshComponent";
import MeshLocalVertexSpace from "@arcgis/core/geometry/support/MeshLocalVertexSpace";
import * as kernel from "@arcgis/core/kernel";
import request from "@arcgis/core/request";
import { FillSymbol3DLayer, MeshSymbol3D } from "@arcgis/core/symbols";
import SceneView from "@arcgis/core/views/SceneView";
import "@esri/calcite-components/dist/calcite/calcite.css";
import App from "./compontents/App";
import * as WebIFC from "./lib/web-ifc-api";
import AppStore from "./stores/AppStore";

import MeshTransform from "@arcgis/core/geometry/support/MeshTransform";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { SimpleRenderer } from "@arcgis/core/renderers";
import { mat4, vec3 } from "gl-matrix";

console.log(`Using ArcGIS Maps SDK for JavaScript v${kernel.fullVersion}`);

// setAssetPath("https://js.arcgis.com/calcite-components/1.0.0-beta.77/assets");

const params = new URLSearchParams(document.location.search.slice(1));

const webSceneId = params.get("webscene") || "e454c0b94ede494687ae3f1be792f2da";

const map = new WebScene({
  portalItem: {
    id: webSceneId,
    // portal: {
    //   url: portalUrl,
    // },
  },
});

const view = new SceneView({
  container: "viewDiv",
  qualityProfile: "high",
  map,
});

(window as any)["view"] = view;

const store = new AppStore({
  view,
});

const app = new App({
  container: "app",
  store,
});

(async () => {
  const ifcAPI = new WebIFC.IfcAPI();
  await ifcAPI.Init();

  const { data } = await request("Building.ifc", {
    responseType: "array-buffer",
  });

  const uint8Array = new Uint8Array(data);

  const modelID = ifcAPI.OpenModel(uint8Array);

  const meshes = [] as Graphic[];

  const entities = ifcAPI.GetIfcEntityList(modelID);

  // entities.forEach((entitiId) => {
  //   const entity = IFC_ENTITIES.find(({ code }) => code === entitiId);
  //   console.log(entitiId, entity?.name);
  // });

  let types = entities.filter(
    (f) => f === WebIFC.IFCSLAB && ifcAPI.IsIfcElement(f),
  );

  const modelTypes = ifcAPI.GetAllTypesOfModel(modelID);
  modelTypes.forEach((type) => {
    console.log(type.typeName);
  });

  const symbol = new MeshSymbol3D({
    symbolLayers: [
      new FillSymbol3DLayer({
        material: {
          color: "white",
        },
      }),
    ],
  });

  let objectId = 0;

  // grab all types except SPACE, OPENING and OPENINGSTANDARDCASE

  // ifcAPI.StreamAllMeshes(modelID, (mesh: WebIFC.FlatMesh) => {
  ifcAPI.StreamAllMeshesWithTypes(modelID, types, (mesh: WebIFC.FlatMesh) => {
    // only during the lifetime of this function call, the geometry is available in memory

    const placedGeometries = mesh.geometries;
    const expressID = mesh.expressID;

    for (let i = 0; i < placedGeometries.size(); i++) {
      const placedGeometry = placedGeometries.get(i);
      const geometry = ifcAPI.GetGeometry(
        modelID,
        placedGeometry.geometryExpressID,
      );

      const verts = ifcAPI.GetVertexArray(
        geometry.GetVertexData(),
        geometry.GetVertexDataSize(),
      );
      const indices = ifcAPI.GetIndexArray(
        geometry.GetIndexData(),
        geometry.GetIndexDataSize(),
      );

      const matrix = placedGeometry.flatTransformation;
      const transform = mat4.fromValues.apply(this, matrix as any);

      const position = [] as number[];
      const normal = [] as number[];
      const out = vec3.create();

      for (let j = 0; j < verts.length; j += 6) {
        vec3.transformMat4(
          out,
          vec3.fromValues(verts.at(j)!, verts.at(j + 1)!, verts.at(j + 2)!),
          transform,
        );
        position.push(out[2], out[0], out[1]);

        vec3.transformMat4(
          out,
          vec3.fromValues(verts.at(j + 3)!, verts.at(j + 4)!, verts.at(j + 5)!),
          transform,
        );
        normal.push(out[2], out[0], out[1]);
      }

      const color = [
        placedGeometry.color.x * 255,
        placedGeometry.color.y * 255,
        placedGeometry.color.z * 255,
        placedGeometry.color.w,
      ];

      const faces = [] as number[];

      for (let j = 0; j < indices.length; j += 3) {
        faces.push(indices.at(j)!, indices.at(j + 1)!, indices.at(j + 2)!);
      }

      const mesh = new Mesh({
        spatialReference: SpatialReference.WGS84,
        vertexAttributes: {
          position,
          // normal,
        },
        components: [
          new MeshComponent({
            faces,
            material: {
              doubleSided: true,
              color,
            },
          }),
        ],
        transform: new MeshTransform({
          rotationAxis: [0, 0, -1],
          rotationAngle: -270 + 11.90268843,
        }),
        vertexSpace: new MeshLocalVertexSpace({
          origin: [8.55944491, 47.3739602, 483.53861683],
        }),
      });

      const typeID = ifcAPI.GetLineType(modelID, expressID);
      const typeName = ifcAPI.GetNameFromTypeCode(typeID);
      const props = JSON.stringify(ifcAPI.GetLine(modelID, expressID, true));
      meshes.push(
        new Graphic({
          attributes: { objectId, expressID, typeID, typeName, props },
          geometry: mesh,
        }),
      );
      objectId++;
    }
  });

  console.log({ meshes });

  const layer = new FeatureLayer({
    spatialReference: SpatialReference.WGS84,
    title: "IFC Entities",
    elevationInfo: { mode: "absolute-height" },
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
      { name: "props", type: "string" },
    ],
    source: meshes,
    geometryType: "mesh",
    renderer: new SimpleRenderer({
      symbol,
    }),
  });

  view.popupEnabled = true;
  view.popup.defaultPopupTemplateEnabled = true;

  map.add(layer);

  await map.loadAll();

  // const sceneLayer = map.allLayers.find(
  //   ({ title }) => title === "Inno Week: IFC-Submission",
  // ) as SceneLayer;

  // const query = sceneLayer.createQuery();
  // query.returnGeometry = true;
  // const { features } = await sceneLayer.queryFeatures(query);

  // console.log({ features });
})();
