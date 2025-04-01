// src/views/Login.vue
<template>
  <div class="login">
    <h2>Login</h2>
    <form @submit.prevent="handleLogin">
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Password" required />
      <button type="submit">Login</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
    <p>Don't have an account? <router-link to="/signup">Sign Up</router-link></p>
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

    const handleLogin = async () => {
      try {
        await store.dispatch('login', {
          email: email.value,
          password: password.value
        });
        router.push('/dashboard');
      } catch (err) {
        error.value = err.message;
      }
    };

    return { email, password, error, handleLogin };
  }
};
</script>

<style scoped>
.login {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
}
input {
  width: 100%;
  margin: 10px 0;
  padding: 10px;
}
.error {
  color: red;
  margin-top: 10px;
}
</style>