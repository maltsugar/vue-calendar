import { createRouter, createWebHashHistory } from "vue-router";
import Calendar from "@/views/Calendar.vue";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: Calendar,
    },
  ],
});

export default router;
