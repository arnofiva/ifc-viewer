import Color from "@arcgis/core/Color";
import Graphic from "@arcgis/core/Graphic";
import { SpatialReference } from "@arcgis/core/geometry";
import Mesh from "@arcgis/core/geometry/Mesh";
import MeshComponent from "@arcgis/core/geometry/support/MeshComponent";
import MeshMaterialMetallicRoughness from "@arcgis/core/geometry/support/MeshMaterialMetallicRoughness";
import * as meshUtils from "@arcgis/core/geometry/support/meshUtils";
import { mat4, vec3 } from "gl-matrix";
import * as WebIFC from "../lib/web-ifc-api";
import { IfcAPI } from "../lib/web-ifc-api";
import { Project } from "./entities/Project";

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

export async function extractEntities(
  project: Project,
  modelID: number,
  spaces: boolean,
) {
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

  // const modelTypes = ifcAPI.GetAllTypesOfModel(modelID);
  // modelTypes.forEach((type) => {
  //   console.log(type.typeName);
  // });

  if (spaces) {
    ifcAPI.StreamAllMeshesWithTypes(
      modelID,
      types,
      createMeshParser(ifcAPI, modelID, project, meshes),
    );
  } else {
    ifcAPI.StreamAllMeshes(
      modelID,
      createMeshParser(ifcAPI, modelID, project, meshes),
    );
  }

  for (const mesh of meshes) {
    const expressID = mesh.getAttribute("expressID");

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

          const nfaQuantity = elementQuantity.Quantities.filter(
            ({ type }) => type === WebIFC.IFCQUANTITYAREA,
          )
            .map((quantity) => quantity as WebIFC.IFC2X3.IfcQuantityArea)
            .find(
              (areaQuantity) => areaQuantity.Name.value === "NetFloorArea",
            )!;
          if (gfaQuantity) {
            mesh.setAttribute("GFA", gfaQuantity.AreaValue.value);
          }
          if (nfaQuantity) {
            mesh.setAttribute("NFA", gfaQuantity.AreaValue.value);
          }
        } else if (pset.type === WebIFC.IFCPROPERTYSET) {
          const propertySet = pset as WebIFC.IFC2X3.IfcPropertySet;
          const category = propertySet.HasProperties.filter(
            ({ type }) => type === WebIFC.IFCPROPERTYSINGLEVALUE,
          )
            .map((property) => property as WebIFC.IFC2X3.IfcPropertySingleValue)
            .find((singleValue) => singleValue.Name.value === "Category");

          const weatherExposure = propertySet.HasProperties.filter(
            ({ type }) => type === WebIFC.IFCPROPERTYSINGLEVALUE,
          )
            .map((property) => property as WebIFC.IFC2X3.IfcPropertySingleValue)
            .find(
              (singleValue) => singleValue.Name.value === "Weather Exposure",
            );

          const level = propertySet.HasProperties.filter(
            ({ type }) => type === WebIFC.IFCPROPERTYSINGLEVALUE,
          )
            .map((property) => property as WebIFC.IFC2X3.IfcPropertySingleValue)
            .find((singleValue) => singleValue.Name.value === "Level");

          const spaceUseType = propertySet.HasProperties.filter(
            ({ type }) => type === WebIFC.IFCPROPERTYSINGLEVALUE,
          )
            .map((property) => property as WebIFC.IFC2X3.IfcPropertySingleValue)
            .find((singleValue) => singleValue.Name.value === "Space Use Type");

          if (category) {
            mesh.setAttribute("category", category.NominalValue?.value);
          }
          if (level) {
            mesh.setAttribute("level", level.NominalValue?.value);
          }
          if (weatherExposure) {
            mesh.setAttribute(
              "weatherExposure",
              weatherExposure.NominalValue?.value,
            );
          }
          if (spaceUseType) {
            mesh.setAttribute("spaceUseType", spaceUseType.NominalValue?.value);
          }
        }
      }
    }
    if (mesh.getAttribute("category") === "Areas") {
      if (
        0 <= (mesh.getAttribute("longName") as string).indexOf("Computable")
      ) {
        mesh.setAttribute("spaceUseType", "Computed");
      } else {
        mesh.setAttribute("spaceUseType", "Built");
      }
    }
  }

  return meshes;
}

const createMeshParser = (
  ifcAPI: WebIFC.IfcAPI,
  modelID: number,
  project: Project,
  meshes: Graphic[],
) => {
  return (ifcMesh: WebIFC.FlatMesh) => {
    // only during the lifetime of this function call, the geometry is available in memory

    const placedGeometries = ifcMesh.geometries;
    const expressID = ifcMesh.expressID;
    let mesh: Mesh | undefined;

    const line = ifcAPI.GetLine(modelID, expressID) as WebIFC.IFC2X3.IfcSpace;

    const longName = line.LongName?.value || line.Name?.value || "";

    const transform = project.transform;
    const vertexSpace = project.vertexSpace;

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
      const mat4Transform = mat4.fromValues.apply(mat4, matrix as any);

      const position = [] as number[];
      const normal = [] as number[];
      const out = vec3.create();

      for (let j = 0; j < verts.length; j += 6) {
        vec3.transformMat4(
          out,
          vec3.fromValues(verts.at(j)!, verts.at(j + 1)!, verts.at(j + 2)!),
          mat4Transform,
        );
        position.push(out[2], out[0], out[1]);

        vec3.transformMat4(
          out,
          vec3.fromValues(verts.at(j + 3)!, verts.at(j + 4)!, verts.at(j + 5)!),
          mat4Transform,
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
        transform,
        vertexSpace,
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
