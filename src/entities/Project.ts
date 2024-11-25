import Accessor from "@arcgis/core/core/Accessor";
import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";
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

  constructor(properties: ProjectProperties) {
    super(properties);
  }
}
