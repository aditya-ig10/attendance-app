// src/views/Start.vue
<template>
  <div class="start">
    <h1>Welcome to Attendance System</h1>
    <router-link to="/login">Login</router-link>
    <router-link to="/signup">Sign Up</router-link>
  </div>
</template>

<style scoped>
.start {
  text-align: center;
  padding: 50px;
}
</style>