// src/views/Start.vue
<template>
  <div class="start">
    <div class="welcome-card">
      <h1>Welcome to Attendance Tracker</h1>
      <p class="subtitle">Manage your attendance with ease and precision</p>
      
      <div class="button-container">
        <router-link to="/login" class="action-btn login-btn">Login</router-link>
        <router-link to="/signup" class="action-btn signup-btn">Sign Up</router-link>
      </div>
      
      <transition name="fade">
        <div class="features" v-if="showFeatures">
          <div class="feature-item"><span class="icon">📅</span><p>Track Daily Attendance</p></div>
          <div class="feature-item"><span class="icon">📊</span><p>Generate Reports</p></div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  setup() {
    const showFeatures = ref(false);
    onMounted(() => setTimeout(() => (showFeatures.value = true), 300));
    return { showFeatures };
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600&display=swap');

* { font-family: 'Lexend', sans-serif; box-sizing: border-box; }

.start {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.welcome-card {
  background: rgba(255, 255, 255, 0.9);
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 500px;
  width: 100%;
}

h1 { color: #2c3e50; font-weight: 500; margin: 0 0 1rem; font-size: 2rem; }

.subtitle { color: #7f8c8d; margin: 0 0 2rem; font-size: 1.1rem; }

.button-container { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; margin-bottom: 2rem; }

.action-btn {
  padding: 0.75rem 2rem;
  text-decoration: none;
  border-radius: 25px;
  color: white;
  font-weight: 500;
  transition: background 0.3s ease;
  display: inline-block;
  min-width: 120px;
  cursor: pointer; /* Explicitly set for touch devices */
  -webkit-tap-highlight-color: transparent; /* Remove tap highlight on mobile */
}

.login-btn { background: #3498db; }
.login-btn:hover, .login-btn:active { background: #2980b9; }

.signup-btn { background: #2ecc71; }
.signup-btn:hover, .signup-btn:active { background: #27ae60; }

.features { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; }

.feature-item { display: flex; align-items: center; gap: 0.5rem; color: #34495e; }

.icon { font-size: 1.5rem; }

.feature-item p { margin: 0; font-size: 0.9rem; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .welcome-card { padding: 1.5rem; }
  h1 { font-size: 1.75rem; }
  .subtitle { font-size: 1rem; }
  .action-btn { padding: 0.6rem 1.5rem; min-width: 100px; }
}

@media (max-width: 480px) {
  h1 { font-size: 1.5rem; }
  .subtitle { font-size: 0.9rem; }
  .button-container { flex-direction: column; gap: 0.75rem; }
  .action-btn { width: 100%; padding: 0.75rem; }
  .feature-item { flex: 1 1 100%; justify-content: center; }
}
</style>