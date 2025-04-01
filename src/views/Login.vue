// src/views/Login.vue
<template>
  <div class="login">
    <div class="login-card">
      <h2>Login</h2>
      <p class="subtitle">Access your attendance dashboard</p>
      <form @submit.prevent="handleLogin">
        <div class="input-group"><input v-model="email" type="email" placeholder="Email" required /></div>
        <div class="input-group"><input v-model="password" type="password" placeholder="Password" required /></div>
        <button type="submit" class="login-btn" :disabled="loading">
          <span v-if="!loading">Login</span>
          <span v-else class="loading-circle"></span>
        </button>
        <transition name="fade"><p v-if="error" class="error">{{ error }}</p></transition>
      </form>
      <div class="links">
        <router-link to="/reset-password">Forgot Password?</router-link>
        <p>Don't have an account? <router-link to="/signup">Sign Up</router-link></p>
      </div>
    </div>
  </div>
</template>

<script>
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ref } from 'vue';

export default {
  setup() {
    const store = useStore();
    const router = useRouter();
    const email = ref('');
    const password = ref('');
    const error = ref('');
    const loading = ref(false);

    const handleLogin = async () => {
      loading.value = true;
      error.value = '';
      try {
        await store.dispatch('login', { email: email.value, password: password.value });
        router.push('/dashboard');
      } catch (err) {
        error.value = err.message || 'Login failed';
      } finally {
        loading.value = false;
      }
    };

    return { email, password, error, loading, handleLogin };
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600&display=swap');

* { font-family: 'Lexend', sans-serif; box-sizing: border-box; }

.login {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.login-card {
  background: rgba(255, 255, 255, 0.9);
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

h2 { color: #2c3e50; font-weight: 500; margin: 0 0 0.5rem; font-size: 1.75rem; }

.subtitle { color: #7f8c8d; margin: 0 0 1.5rem; font-size: 1rem; }

.input-group { margin-bottom: 1rem; }

input {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 1rem;
}

.login-btn {
  width: 100%;
  padding: 0.75rem;
  background: #3498db;
  border: none;
  border-radius: 25px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s ease;
  position: relative;
  -webkit-tap-highlight-color: transparent;
}

.login-btn:hover:not(:disabled), .login-btn:active:not(:disabled) { background: #2980b9; }
.login-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.error { color: #e74c3c; margin: 1rem 0 0; font-size: 0.9rem; }

.links { margin-top: 1.5rem; }
.links a { color: #3498db; text-decoration: none; font-weight: 500; }
.links a:hover { text-decoration: underline; }
.links p { margin: 0.5rem 0 0; color: #7f8c8d; }

.loading-circle {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 480px) {
  .login-card { padding: 1.5rem; }
  h2 { font-size: 1.5rem; }
  .subtitle { font-size: 0.9rem; }
  input, .login-btn { padding: 0.6rem; }
}
</style>