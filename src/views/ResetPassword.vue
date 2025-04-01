// src/views/ResetPassword.vue
<template>
  <div class="reset-password">
    <div class="reset-card">
      <h2>Reset Password</h2>
      <p class="subtitle">Enter your email to receive a password reset link</p>
      
      <form @submit.prevent="handleResetPassword">
        <div class="input-group">
          <input v-model="email" type="email" placeholder="Email" required />
        </div>
        <button type="submit" class="reset-btn" :disabled="loading">
          <span v-if="!loading">Send Reset Link</span>
          <span v-else class="loading-circle"></span>
        </button>
        <transition name="fade">
          <p v-if="message" class="success">{{ message }}</p>
        </transition>
        <transition name="fade">
          <p v-if="error" class="error">{{ error }}</p>
        </transition>
      </form>

      <div class="links">
        <router-link to="/login">Back to Login</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export default {
  setup() {
    const email = ref('');
    const loading = ref(false);
    const message = ref('');
    const error = ref('');

    const handleResetPassword = async () => {
      loading.value = true;
      message.value = '';
      error.value = '';
      try {
        await sendPasswordResetEmail(auth, email.value);
        message.value = 'Password reset email sent successfully! Check your inbox.';
        email.value = '';
      } catch (err) {
        error.value = err.message || 'Failed to send reset email';
      } finally {
        loading.value = false;
      }
    };

    return { email, loading, message, error, handleResetPassword };
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600&display=swap');

* {
  font-family: 'Lexend', sans-serif;
  box-sizing: border-box;
}

.reset-password {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.reset-card {
  background: rgba(255, 255, 255, 0.9);
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

h2 {
  color: #2c3e50;
  font-weight: 500;
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
}

.subtitle {
  color: #7f8c8d;
  margin: 0 0 1.5rem;
  font-size: 1rem;
}

.input-group {
  margin-bottom: 1rem;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 1rem;
}

.reset-btn {
  width: 100%;
  padding: 0.75rem;
  background: #e74c3c;
  border: none;
  border-radius: 25px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.reset-btn:hover:not(:disabled) {
  background: #c0392b;
  transform: translateY(-2px);
}

.reset-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success {
  color: #2ecc71;
  margin: 1rem 0 0;
  font-size: 0.9rem;
}

.error {
  color: #e74c3c;
  margin: 1rem 0 0;
  font-size: 0.9rem;
}

.links {
  margin-top: 1.5rem;
}

.links a {
  color: #3498db;
  text-decoration: none;
  font-weight: 500;
}

.links a:hover {
  text-decoration: underline;
}

.loading-circle {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

/* Animations */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive Design */
@media (max-width: 480px) {
  .reset-card {
    padding: 1.5rem;
  }

  h2 {
    font-size: 1.5rem;
  }

  .subtitle {
    font-size: 0.9rem;
  }

  input {
    padding: 0.6rem;
  }

  .reset-btn {
    padding: 0.6rem;
  }
}
</style>