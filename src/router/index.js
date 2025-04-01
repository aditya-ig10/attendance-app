// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { auth } from '../firebase';

const routes = [
  {
    path: '/',
    name: 'Start',
    component: () => import('../views/Start.vue'),
    meta: { title: 'AtulFun - Welcome' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: 'AtulFun - Login' }
  },
  {
    path: '/signup',
    name: 'Signup',
    component: () => import('../views/Signup.vue'),
    meta: { title: 'AtulFun - Sign Up' }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { title: 'AtulFun - Dashboard', requiresAuth: true }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('../views/ResetPassword.vue'),
    meta: { title: 'AtulFun - Reset Password' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  // Set document title
  document.title = to.meta.title || 'AtulFun';

  // Authentication check
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