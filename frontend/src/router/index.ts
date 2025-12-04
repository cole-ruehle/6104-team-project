import { createRouter, createWebHistory } from "vue-router";

const MultiSourceNetworkPage = () =>
  import("@/pages/MultiSourceNetworkPage.vue");
const PublicProfilePage = () => import("@/pages/PublicProfilePage.vue");
const LinkedInImportPage = () => import("@/pages/LinkedInImportPage.vue");
const NetworkSearchPage = () => import("@/pages/NetworkSearchPage.vue");
const DuplicateConfirmationPage = () =>
  import("@/pages/DuplicateConfirmationPage.vue");

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/network",
    },
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
      path: "/import",
      name: "import",
      component: LinkedInImportPage,
    },
    {
      path: "/search",
      name: "search",
      component: NetworkSearchPage,
    },
    {
      path: "/duplicates",
      name: "duplicates",
      component: DuplicateConfirmationPage,
    },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
