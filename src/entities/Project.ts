import Accessor from "@arcgis/core/core/Accessor";
import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";
import MeshLocalVertexSpace from "@arcgis/core/geometry/support/MeshLocalVertexSpace";
import MeshTransform from "@arcgis/core/geometry/support/MeshTransform";
import Graphic from "@arcgis/core/Graphic";

export type ProjectProperties = Pick<Project, "graphic">;

// declare our own Widget class to avoid boilerplate in defining the constructor
@subclass()
export class Project extends Accessor {
  @property({ constructOnly: true })
  graphic: Graphic;

  @property()
  get name() {
    return this.graphic.getAttribute("Name");
  }

  @property()
  get description() {
    return this.graphic.getAttribute("Description");
  }

  @property()
  get location() {
    return this.graphic.getAttribute("Location");
  }

  @property()
  get format() {
    return this.graphic.getAttribute("ESRI3DO_TYPE");
  }

  @property()
  get creator() {
    return this.graphic.getAttribute("Creator");
  }

  @property()
  get transform() {
    return new MeshTransform({
      rotationAxis: [
        this.a("ESRI3DO_RX"),
        this.a("ESRI3DO_RZ"),
        this.a("ESRI3DO_RY"),
      ],
      rotationAngle: 90 + this.a("ESRI3DO_RDEG"),
      scale: [this.a("ESRI3DO_SX"), this.a("ESRI3DO_SZ"), this.a("ESRI3DO_SY")],
      translation: [
        this.a("ESRI3DO_TX"),
        this.a("ESRI3DO_TZ"),
        this.a("ESRI3DO_TY"),
      ],
    });
  }

  @property()
  get vertexSpace() {
    return new MeshLocalVertexSpace({
      origin: [
        this.a("ESRI3DO_OX"),
        this.a("ESRI3DO_OY"),
        this.a("ESRI3DO_OZ"),
      ],
    });
  }

  constructor(properties: ProjectProperties) {
    super(properties);
  }

  private a(name: string) {
    return this.graphic.getAttribute(name);
  }
}
