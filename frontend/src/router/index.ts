import { createRouter, createWebHistory } from "vue-router";

const MultiSourceNetworkPage = () =>
  import("@/pages/MultiSourceNetworkPage.vue");
const PublicProfilePage = () => import("@/pages/PublicProfilePage.vue");

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
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
