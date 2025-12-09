import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/useAuthStore";

const HomePage = () => import("@/pages/HomePage.vue");
const EditNetworkPage = () => import("@/pages/EditNetworkPage.vue");
const TutorialsPage = () => import("@/pages/TutorialsPage.vue");
const ExportPage = () => import("@/pages/ExportPage.vue");
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
      name: "landing",
      component: () => import("@/pages/LandingPage.vue"),
    },
    {
      path: "/home",
      name: "home",
      component: HomePage,
      meta: { requiresAuth: true },
    },
    {
      path: "/tutorials",
      name: "tutorials",
      component: TutorialsPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/export",
      name: "export",
      component: ExportPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/edit-network",
      name: "edit-network",
      component: EditNetworkPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/import",
      name: "import",
      component: LinkedInImportPage,
      meta: { requiresAuth: true },
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

// Route guard to protect authenticated routes
router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    // Redirect to landing page if not authenticated
    next({ name: "landing" });
  } else if (to.name === "landing" && auth.isAuthenticated) {
    // Redirect to home if already authenticated and trying to access landing
    next({ name: "home" });
  } else {
    next();
  }
});

export default router;
