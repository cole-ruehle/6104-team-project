import { createRouter, createWebHistory } from "vue-router";

const HomePage = () => import("@/pages/HomePage.vue");
const EditNetworkPage = () => import("@/pages/EditNetworkPage.vue");
const LinkedInImportPage = () => import("@/pages/LinkedInImportPage.vue");
// Keep old routes for backward compatibility (deprecated)
const MultiSourceNetworkPage = () =>
  import("@/pages/MultiSourceNetworkPage.vue");
const PublicProfilePage = () => import("@/pages/PublicProfilePage.vue");
const NetworkSearchPage = () => import("@/pages/NetworkSearchPage.vue");

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/home",
    },
    {
      path: "/home",
      name: "home",
      component: HomePage,
    },
    {
      path: "/edit-network",
      name: "edit-network",
      component: EditNetworkPage,
    },
    {
      path: "/import",
      name: "import",
      component: LinkedInImportPage,
    },
    // Deprecated routes - kept for backward compatibility
    {
      path: "/network",
      name: "network",
      component: MultiSourceNetworkPage,
    },
    {
      path: "/profiles",
      name: "profiles",
      component: PublicProfilePage,
    },
    {
      path: "/search",
      name: "search",
      component: NetworkSearchPage,
    },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
