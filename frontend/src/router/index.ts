import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'landing',
    component: () => import('../pages/LandingPage.vue'),
  },
  {
    path: '/import',
    name: 'import',
    component: () => import('../pages/ImportPage.vue'),
  },
  {
    path: '/review',
    name: 'review',
    component: () => import('../pages/RevisionPage.vue'),
  },
  {
    path: '/manager',
    name: 'manager',
    component: () => import('../pages/DeckManagerPage.vue'),
  },
  {
    path: '/backup',
    name: 'backup',
    component: () => import('../pages/BackupRestorePage.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
