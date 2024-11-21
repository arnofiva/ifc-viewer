import WebScene from "@arcgis/core/WebScene";
import * as kernel from "@arcgis/core/kernel";
import request from "@arcgis/core/request";
import SceneView from "@arcgis/core/views/SceneView";
import "@esri/calcite-components/dist/calcite/calcite.css";
import App from "./compontents/App";
import * as IfcAPI from "./lib/web-ifc-api";
import AppStore from "./stores/AppStore";

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

(async () => {
  console.log({ IfcAPI });

  const ifcAPI = new IfcAPI.IfcAPI();
  await ifcAPI.Init();

  const { data } = await request("Building.ifc", {
    responseType: "array-buffer",
  });

  console.log({ data });

  const uint8Array = new Uint8Array(data);

  const result = ifcAPI.OpenModel(uint8Array);

  console.log("Model opened", { result });
})();

const view = new SceneView({
  container: "viewDiv",
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
