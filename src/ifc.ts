import Color from "@arcgis/core/Color";
import Graphic from "@arcgis/core/Graphic";
import { SpatialReference } from "@arcgis/core/geometry";
import Mesh from "@arcgis/core/geometry/Mesh";
import MeshComponent from "@arcgis/core/geometry/support/MeshComponent";
import MeshLocalVertexSpace from "@arcgis/core/geometry/support/MeshLocalVertexSpace";
import MeshMaterialMetallicRoughness from "@arcgis/core/geometry/support/MeshMaterialMetallicRoughness";
import MeshTransform from "@arcgis/core/geometry/support/MeshTransform";
import * as meshUtils from "@arcgis/core/geometry/support/meshUtils";
import { mat4, vec3 } from "gl-matrix";
import * as WebIFC from "../lib/web-ifc-api";
import { IfcAPI } from "../lib/web-ifc-api";

let ifcAPI: IfcAPI | null = null;

async function createAPI() {
  if (!ifcAPI) {
    ifcAPI = new WebIFC.IfcAPI();
    await ifcAPI.Init();
  }
  return ifcAPI;
}

export async function loadModel(file: File) {
  const ifcAPI = await createAPI();
  const bytes = await file.arrayBuffer();

  return ifcAPI.OpenModel(new Uint8Array(bytes));
}

export async function closeModel(modelID: number) {
  if (ifcAPI) {
    ifcAPI.CloseModel(modelID);
  }
}

export async function extractEntities(modelID: number, spaces: boolean) {
  const ifcAPI = await createAPI();

  const meshes = [] as Graphic[];

  const entities = ifcAPI.GetIfcEntityList(modelID);

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

  if (spaces) {
    ifcAPI.StreamAllMeshesWithTypes(
      modelID,
      types,
      createMeshParser(ifcAPI, modelID, meshes),
    );
  } else {
    ifcAPI.StreamAllMeshes(modelID, createMeshParser(ifcAPI, modelID, meshes));
  }

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

  return meshes;
}

const createMeshParser = (
  ifcAPI: WebIFC.IfcAPI,
  modelID: number,
  meshes: Graphic[],
) => {
  return (ifcMesh: WebIFC.FlatMesh) => {
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
      const transform = mat4.fromValues.apply(mat4, matrix as any);

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
        objectId: meshes.length,
        expressID,
        typeID,
        typeName,
        longName,
      },
      geometry: mesh,
    });

    meshes.push(graphic);
  };
};
