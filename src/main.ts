import WebScene from "@arcgis/core/WebScene";
import * as kernel from "@arcgis/core/kernel";
import SceneView from "@arcgis/core/views/SceneView";
import "@esri/calcite-components/dist/calcite/calcite.css";
import App from "./compontents/App";
import AppStore from "./stores/AppStore";

import { whenOnce } from "@arcgis/core/core/reactiveUtils";
import Popup from "@arcgis/core/widgets/Popup";
import { entityLayer } from "./layers";

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
  layers: [entityLayer],
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
