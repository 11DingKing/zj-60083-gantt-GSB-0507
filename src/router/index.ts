import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import GanttView from '../views/GanttView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Gantt',
    component: GanttView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
