import { loadCourseMap } from "./data/api.js";
import { router } from "./routes/routes.js";

export async function initApp() {
  await loadCourseMap();
  router();
}