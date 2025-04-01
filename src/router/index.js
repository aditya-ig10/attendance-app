// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { auth } from '../firebase';

const routes = [
  {
    path: '/',
    name: 'Start',
    component: () => import('../views/Start.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/signup',
    name: 'Signup',
    component: () => import('../views/Signup.vue')
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  
  auth.onAuthStateChanged((user) => {
    if (requiresAuth && !user) {
      next('/login');
    } else if (!requiresAuth && user && to.path !== '/dashboard') {
      next('/dashboard');
    } else {
      next();
    }
  });
});

export default router;