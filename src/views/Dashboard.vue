// src/views/Dashboard.vue
<template>
  <div class="dashboard">
    <h2 v-if="user">Welcome, {{ user.name }}</h2>
    <p v-if="user">Department: {{ user.department }}</p>
    <button @click="logout">Logout</button>

    <div class="attendance-controls">
      <button v-if="!currentInTime" @click="recordInTime">In</button>
      <button v-else @click="recordOutTime">Out</button>
      <p v-if="currentInTime">Last In Time: {{ currentInTime }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <div class="calendar-section">
      <h3>Attendance Calendar</h3>
      <div class="calendar-controls">
        <button @click="prevMonth">&lt;</button>
        <span>{{ currentMonthYear }}</span>
        <button @click="nextMonth">&gt;</button>
        <button @click="downloadPDF">Download PDF</button>
      </div>
      <div class="calendar">
        <div class="day-header" v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day">
          {{ day }}
        </div>
        <div v-for="(day, index) in paddedDaysInMonth" :key="index" 
             :class="['day', getDayClass(day)]"
             @click="toggleHoliday(day)">
          <span v-if="day">{{ day.getDate() }}</span>
          <span v-if="isHoliday(day)" class="holiday-marker">H</span>
          <span v-if="hasAttendance(day)" class="attendance-marker">A</span>
        </div>
      </div>
      <div v-if="selectedDate" class="holiday-form">
        <input v-model="holidayDesc" placeholder="Holiday Description" />
        <button @click="addHoliday">Add Holiday</button>
      </div>
    </div>

    <table v-if="attendance.length">
      <thead>
        <tr>
          <th>Date</th>
          <th>In Time</th>
          <th>Out Time</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="record in attendance" :key="record.id">
          <td>{{ formatDate(record.date) }}</td>
          <td>{{ record.inTime }}</td>
          <td>{{ record.outTime }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ref, onMounted, computed } from 'vue';
import { auth } from '../firebase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default {
  setup() {
    const store = useStore();
    const router = useRouter();
    const error = ref('');
    const currentDate = ref(new Date());
    const holidayDesc = ref('');
    const selectedDate = ref(null);

    const user = computed(() => store.state.user);
    const attendance = computed(() => store.state.attendance);
    const holidays = computed(() => store.state.holidays);
    const currentInTime = computed(() => store.state.currentInTime);

    const recordInTime = async () => {
      try {
        await store.dispatch('recordInTime');
        error.value = '';
      } catch (err) {
        error.value = err.message || 'Failed to record in time';
      }
    };

    const recordOutTime = async () => {
      try {
        await store.dispatch('recordOutTime');
        error.value = '';
      } catch (err) {
        error.value = err.message || 'Failed to record out time';
      }
    };

    const logout = async () => {
      await store.dispatch('logout');
      router.push('/login');
    };

    const formatDate = (date) => new Date(date).toLocaleDateString();

    const paddedDaysInMonth = computed(() => {
      const date = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1);
      const days = [];
      const firstDay = date.getDay();
      // Add padding for days before the first of the month
      for (let i = 0; i < firstDay; i++) {
        days.push(null);
      }
      // Add actual days
      const month = date.getMonth();
      while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
      }
      return days;
    });

    const currentMonthYear = computed(() => 
      currentDate.value.toLocaleString('default', { month: 'long', year: 'numeric' })
    );

    const getDayClass = (day) => {
      if (!day) return ['empty'];
      const classes = [];
      const today = new Date();
      if (day.toDateString() === today.toDateString()) classes.push('today');
      if (day.getDay() === 0) classes.push('sunday');
      if (day.getDay() === 6) classes.push('saturday');
      if (isHoliday(day)) classes.push('holiday');
      return classes;
    };

    const isHoliday = (day) => 
      day && holidays.value.some(h => new Date(h.date).toDateString() === day.toDateString());

    const hasAttendance = (day) => 
      day && attendance.value.some(a => new Date(a.date).toDateString() === day.toDateString());

    const toggleHoliday = (day) => {
      if (!day) return;
      selectedDate.value = isHoliday(day) ? null : day;
      holidayDesc.value = '';
    };

    const addHoliday = async () => {
      if (!holidayDesc.value || !selectedDate.value) return;
      try {
        await store.dispatch('addHoliday', {
          date: selectedDate.value,
          description: holidayDesc.value
        });
        holidayDesc.value = '';
        selectedDate.value = null;
      } catch (err) {
        error.value = err.message || 'Failed to add holiday';
      }
    };

    const prevMonth = () => {
      currentDate.value = new Date(currentDate.value.setMonth(currentDate.value.getMonth() - 1));
    };

    const nextMonth = () => {
      currentDate.value = new Date(currentDate.value.setMonth(currentDate.value.getMonth() + 1));
    };

    const downloadPDF = () => {
      const doc = new jsPDF();
      doc.text(`Attendance Report - ${currentMonthYear.value}`, 14, 15);
      
      const tableData = attendance.value.map(record => [
        formatDate(record.date),
        record.inTime,
        record.outTime
      ]);

      doc.autoTable({
        startY: 25,
        head: [['Date', 'In Time', 'Out Time']],
        body: tableData
      });

      doc.save(`attendance_${currentMonthYear.value}.pdf`);
    };

    onMounted(async () => {
      try {
        await new Promise((resolve) => {
          auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
              if (!store.state.user) await store.dispatch('fetchUserData', firebaseUser.uid);
              await Promise.all([
                store.dispatch('fetchAttendance'),
                store.dispatch('fetchHolidays')
              ]);
            } else {
              router.push('/login');
            }
            resolve();
          });
        });
      } catch (err) {
        console.error('Error during mount:', err);
        error.value = 'Failed to load dashboard';
      }
    });

    return {
      user, attendance, holidays, error, currentInTime,
      recordInTime, recordOutTime, logout, formatDate,
      paddedDaysInMonth, currentMonthYear, getDayClass, isHoliday, hasAttendance,
      toggleHoliday, addHoliday, prevMonth, nextMonth, holidayDesc, selectedDate,
      downloadPDF
    };
  }
};
</script>

<style scoped>
.dashboard {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}
.attendance-controls {
  margin: 20px 0;
}
button {
  padding: 8px 16px;
  margin: 5px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
}
button:hover {
  background-color: #0056b3;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}
th, td {
  border: 1px solid #ddd;
  padding: 8px;
}
.error {
  color: red;
  margin: 5px 0;
}
.calendar-section {
  margin: 20px 0;
}
.calendar-controls {
  margin-bottom: 10px;
}
.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}
.day-header {
  text-align: center;
  padding: 5px;
  background-color: #f0f0f0;
  font-weight: bold;
}
.day {
  padding: 10px;
  text-align: center;
  border: 1px solid #ddd;
  cursor: pointer;
  min-height: 50px;
}
.empty {
  border: none;
  background-color: transparent;
}
.today {
  background-color: #fff3cd;
}
.sunday {
  background-color: #cce5ff;
}
.saturday {
  background-color: #f0f0f0;
}
.holiday {
  background-color: #e6ffe6;
}
.holiday-marker, .attendance-marker {
  display: block;
  font-size: 0.8em;
  color: #666;
}
.holiday-form {
  margin-top: 10px;
}
input {
  padding: 8px;
  margin: 5px;
}
</style>