// src/views/Signup.vue
<template>
  <div class="signup">
    <h2>Sign Up</h2>
    <form @submit.prevent="handleSignup">
      <input v-model="name" type="text" placeholder="Full Name" required />
      <input v-model="department" type="text" placeholder="Department" required />
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Password" required minlength="6" />
      <button type="submit">Sign Up</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
    <p>Already have an account? <router-link to="/login">Login</router-link></p>
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
    const name = ref('');
    const department = ref('');
    const email = ref('');
    const password = ref('');
    const error = ref('');

    const handleSignup = async () => {
      try {
        await store.dispatch('signup', {
          name: name.value,
          department: department.value,
          email: email.value,
          password: password.value
        });
        router.push('/dashboard');
      } catch (err) {
        error.value = err.message;
      }
    };

    return { name, department, email, password, error, handleSignup };
  }
};
</script>

<style scoped>
.signup {
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