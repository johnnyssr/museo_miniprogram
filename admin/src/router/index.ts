import { createRouter, createWebHashHistory } from 'vue-router'
import { currentUserId } from '../cloudbase'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/exhibits',
      name: 'exhibits',
      component: () => import('../views/ExhibitListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/exhibits/new',
      name: 'exhibit-new',
      component: () => import('../views/ExhibitEditView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/exhibits/:id/edit',
      name: 'exhibit-edit',
      component: () => import('../views/ExhibitEditView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

// 路由守卫：需要登录的页面未登录则跳登录页
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  const uid = await currentUserId()
  if (uid) return true
  return { name: 'login', query: { redirect: to.fullPath } }
})

export default router
