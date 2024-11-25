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
import * as WebIFC from "../lib/web-ifc-api";
import App from "./compontents/App";
import AppStore from "./stores/AppStore";

import Color from "@arcgis/core/Color";
import { whenOnce } from "@arcgis/core/core/reactiveUtils";
import MeshMaterialMetallicRoughness from "@arcgis/core/geometry/support/MeshMaterialMetallicRoughness";
import MeshTransform from "@arcgis/core/geometry/support/MeshTransform";
import * as meshUtils from "@arcgis/core/geometry/support/meshUtils";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import SceneLayer from "@arcgis/core/layers/SceneLayer";
import { SimpleRenderer } from "@arcgis/core/renderers";
import SolidEdges3D from "@arcgis/core/symbols/edges/SolidEdges3D";
import Popup from "@arcgis/core/widgets/Popup";
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

  popupEnabled: true,
  popup: new Popup({
    defaultPopupTemplateEnabled: true,
  }),
});

whenOnce(() => view.popup.featureCount).then(() => {
  view.popup.dockEnabled = true;
  view.popup.dockOptions = {
    position: "top-right",
  };
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

  const { data } = await request("LeopoldPointBuilding_2x3/Medium.ifc", {
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

  const ifcTypes = [
    // WebIFC.IFCRELSPACEBOUNDARY,

    WebIFC.IFCSPACE,
    // WebIFC.IFCSPACETYPE,
    // WebIFC.IFCRELSPACEBOUNDARY,
    // WebIFC.IFCPOLYGONALBOUNDEDHALFSPACE,
    // WebIFC.IFCHALFSPACESOLID,
  ];

  let types = entities.filter(
    (f) => 0 <= ifcTypes.indexOf(f) && ifcAPI.IsIfcElement(f),
  );

  const modelTypes = ifcAPI.GetAllTypesOfModel(modelID);
  modelTypes.forEach((type) => {
    console.log(type.typeName);
  });

  const symbol = new MeshSymbol3D({
    symbolLayers: [
      new FillSymbol3DLayer({
        material: {
          color: [255, 255, 255, 0.35],
        },
        edges: new SolidEdges3D({
          color: [20, 20, 20],
          size: 0.8,
        }),
      }),
    ],
  });

  let objectId = 0;

  // grab all types except SPACE, OPENING and OPENINGSTANDARDCASE

  await map.loadAll();

  const sceneLayer = map.allLayers.find(
    ({ title }) => title === "Inno Week: IFC-Submission",
  ) as SceneLayer;

  // const query = sceneLayer.createQuery();
  // query.returnGeometry = true;
  // const { features } = await sceneLayer.queryFeatures(query);

  // console.log({ features });

  // ifcAPI.StreamAllMeshes(modelID, (ifcMesh: WebIFC.FlatMesh) => {
  ifcAPI.StreamAllMeshesWithTypes(
    modelID,
    types,
    (ifcMesh: WebIFC.FlatMesh, index, total) => {
      // only during the lifetime of this function call, the geometry is available in memory

      const placedGeometries = ifcMesh.geometries;
      const expressID = ifcMesh.expressID;
      let mesh: Mesh | undefined;

      const line = ifcAPI.GetLine(modelID, expressID) as WebIFC.IFC2X3.IfcSpace;

      const longName = line.LongName?.value || "";

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
            vec3.fromValues(
              verts.at(j + 3)!,
              verts.at(j + 4)!,
              verts.at(j + 5)!,
            ),
            transform,
          );
          normal.push(out[2], out[0], out[1]);
        }

        const c = placedGeometry.color;

        const color = new Color([
          Math.pow(c.x, 1.0 / 2.2) * 255,
          Math.pow(c.y, 1.0 / 2.2) * 255,
          Math.pow(c.z, 1.0 / 2.2) * 255,
          c.w,
        ]);
        // const color = new Color(`rgba(c.x,c.y,c.z,c.w)`);

        // const color = [
        //   Math.pow(placedGeometry.color.x, 2.2) * 255,
        //   Math.pow(placedGeometry.color.y, 2.2) * 255,
        //   Math.pow(placedGeometry.color.z, 2.2) * 255,
        //   placedGeometry.color.w,
        // ];

        const faces = [] as number[];

        for (let j = 0; j < indices.length; j += 3) {
          faces.push(indices.at(j)!, indices.at(j + 1)!, indices.at(j + 2)!);
        }

        const component = new Mesh({
          spatialReference: SpatialReference.WGS84,
          vertexAttributes: {
            position,
            // normal,
          },
          components: [
            new MeshComponent({
              faces,
              material: new MeshMaterialMetallicRoughness({
                doubleSided: true,
                color,
              }),
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
        if (mesh) {
          mesh = meshUtils.merge([mesh, component]);
        } else {
          mesh = component;
        }
      }

      const typeID = ifcAPI.GetLineType(modelID, expressID);
      const typeName = ifcAPI.GetNameFromTypeCode(typeID);

      const graphic = new Graphic({
        attributes: {
          objectId,
          expressID,
          typeID,
          typeName,
          longName,
        },
        geometry: mesh,
      });

      objectId++;

      meshes.push(graphic);
    },
  );

  for (const mesh of meshes) {
    const expressID = mesh.getAttribute("expressID");
    const longName = mesh.getAttribute("longName");

    let GFA = 0;

    const propertySets = await ifcAPI.properties.getPropertySets(
      modelID,
      expressID,
      true,
    );

    for (let i = 0; i < propertySets.length; i++) {
      const pset = propertySets.at(i);
      if (pset) {
        if (pset.type === WebIFC.IFCELEMENTQUANTITY) {
          const elementQuantity = pset as WebIFC.IFC2X3.IfcElementQuantity;
          const gfaQuantity = elementQuantity.Quantities.filter(
            ({ type }) => type === WebIFC.IFCQUANTITYAREA,
          )
            .map((quantity) => quantity as WebIFC.IFC2X3.IfcQuantityArea)
            .find(
              (areaQuantity) => areaQuantity.Name.value === "GrossFloorArea",
            )!;
          if (gfaQuantity) {
            GFA = gfaQuantity.AreaValue.value;
            mesh.setAttribute("GFA", GFA);
          }
        } else if (pset.type === WebIFC.IFCPROPERTYSET) {
          const propertySet = pset as WebIFC.IFC2X3.IfcPropertySet;
          const category = propertySet.HasProperties.filter(
            ({ type }) => type === WebIFC.IFCPROPERTYSINGLEVALUE,
          )
            .map((property) => property as WebIFC.IFC2X3.IfcPropertySingleValue)
            .find((singleValue) => singleValue.Name.value === "Category");

          const level = propertySet.HasProperties.filter(
            ({ type }) => type === WebIFC.IFCPROPERTYSINGLEVALUE,
          )
            .map((property) => property as WebIFC.IFC2X3.IfcPropertySingleValue)
            .find((singleValue) => singleValue.Name.value === "Level");

          if (category) {
            mesh.setAttribute("category", category.NominalValue?.value);
          }
          if (level) {
            mesh.setAttribute("level", level.NominalValue?.value);
          }
        }
      }
    }
  }

  const layer = new FeatureLayer({
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
    source: meshes,
    geometryType: "mesh",
    renderer: new SimpleRenderer({
      symbol,
    }),
  });

  map.add(
    new GroupLayer({
      layers: [layer, sceneLayer],
      title: "Building",
      visibilityMode: "independent",
    }),
  );
})();
