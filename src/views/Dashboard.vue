// src/views/Dashboard.vue
<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <div class="user-info" v-if="user">
        <h2>Welcome, {{ user.name }}</h2>
        <p class="department">{{ user.department }}</p>
      </div>
      <button class="logout-btn" @click="logout" :disabled="loading.logout">
        <span v-if="!loading.logout">Logout</span>
        <span v-else class="loading-circle"></span>
      </button>
    </header>

    <section class="attendance-controls">
      <button 
        :class="['action-btn', { 'in-btn': !todayAttendance || !todayAttendance.inTime }]" 
        @click="recordTime()"
        :disabled="loading.inOut || (!todayAttendance && currentInTime)"
      >
        <span v-if="!loading.inOut">{{ todayAttendance && todayAttendance.outTime ? 'Edit' : (todayAttendance ? 'Out' : 'In') }}</span>
        <span v-else class="loading-circle"></span>
      </button>
      <transition name="fade">
        <div v-if="todayAttendance" class="time-display">
          <p>In: {{ todayAttendance.inTime }}</p>
          <p v-if="todayAttendance.outTime">Out: {{ todayAttendance.outTime }}</p>
          <p v-if="elapsedTime && !todayAttendance.outTime">({{ elapsedTime }})</p>
        </div>
      </transition>
      <transition name="fade">
        <p v-if="error" class="error">{{ error }}</p>
      </transition>
      <transition name="fade">
        <div v-if="todayAttendance && !todayAttendance.outTime" class="edit-form">
          <input v-model="editInTime" placeholder="Edit In Time (HH:MM:SS AM/PM)" />
          <button @click="saveEdit" :disabled="loading.edit">
            <span v-if="!loading.edit">Save</span>
            <span v-else class="loading-circle"></span>
          </button>
        </div>
      </transition>
    </section>

    <section class="calendar-section">
      <h3>Attendance Calendar</h3>
      <div class="calendar-controls">
        <button class="nav-btn" @click="prevMonth"><</button>
        <span class="month-year">{{ currentMonthYear }}</span>
        <button class="nav-btn" @click="nextMonth">></button>
        <button class="pdf-btn" @click="downloadPDF" :disabled="loading.pdf">
          <span v-if="!loading.pdf">Download PDF</span>
          <span v-else class="loading-circle"></span>
        </button>
      </div>
      <div class="calendar">
        <div class="day-header" v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day">{{ day }}</div>
        <div v-for="(day, index) in paddedDaysInMonth" :key="index" :class="['day', getDayClass(day)]" @click="isAdmin && toggleHoliday(day)">
          <span v-if="day" class="day-number">{{ day.getDate() }}</span>
          <span v-if="isHoliday(day)" class="holiday-marker">H</span>
          <span v-if="hasAttendance(day)" class="present-marker">P</span>
        </div>
      </div>
      <transition name="slide">
        <div v-if="isAdmin && selectedDate" class="holiday-form">
          <input v-model="holidayDesc" placeholder="Holiday Description" />
          <button @click="addHoliday" :disabled="loading.holiday">
            <span v-if="!loading.holiday">Add Holiday</span>
            <span v-else class="loading-circle"></span>
          </button>
        </div>
      </transition>
      <div class="color-legend">
        <div class="legend-item"><span class="color-box sky-blue"></span> Weekend</div>
        <div class="legend-item"><span class="color-box yellow"></span> Present</div>
        <div class="legend-item"><span class="color-box orange"></span> In Only</div>
        <div class="legend-item"><span class="color-box green"></span> Holiday</div>
        <div class="legend-item"><span class="color-box beige"></span> Today</div>
      </div>
    </section>

    <section class="records-section" v-if="attendance.length">
      <table>
        <thead><tr><th>Date</th><th>In Time</th><th>Out Time</th><th>Working Time</th></tr></thead>
        <tbody>
          <tr v-for="record in attendance" :key="record.id">
            <td>{{ formatDate(record.date) }}</td>
            <td>{{ record.inTime }}</td>
            <td>{{ record.outTime }}</td>
            <td>{{ calculateWorkingTime(record) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-if="isAdmin" class="users-section">
      <h3>All Users</h3>
      <table>
        <thead><tr><th>Name</th><th>Department</th><th>Email</th><th>Action</th></tr></thead>
        <tbody>
          <tr v-for="user in allUsers" :key="user.id">
            <td>{{ user.name }}</td>
            <td>{{ user.department }}</td>
            <td>{{ user.email }}</td>
            <td>
              <button class="delete-btn" @click="deleteUser(user.id)" :disabled="loading.delete === user.id">
                <span v-if="loading.delete !== user.id">Delete</span>
                <span v-else class="loading-circle"></span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script>
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default {
  setup() {
    const store = useStore();
    const router = useRouter();
    const error = ref('');
    const currentDate = ref(new Date());
    const holidayDesc = ref('');
    const selectedDate = ref(null);
    const editInTime = ref('');
    const loading = ref({ inOut: false, logout: false, pdf: false, holiday: false, edit: false, delete: null });
    const elapsedTime = ref('');
    let timerInterval = null;

    const user = computed(() => store.state.user);
    const attendance = computed(() => store.state.attendance);
    const holidays = computed(() => store.state.holidays);
    const currentInTime = computed(() => store.state.currentInTime);
    const allUsers = computed(() => store.state.allUsers);
    const isAdmin = computed(() => store.state.user?.email === 'admin@atul.fun');
    const todayAttendance = computed(() => {
      const today = new Date().toISOString().split('T')[0];
      return attendance.value.find(a => a.date === today);
    });

    const updateElapsedTime = async () => {
      if (currentInTime.value && user.value?.uid) {
        const userTimerDoc = await getDoc(doc(db, 'users', user.value.uid));
        const inTimeData = userTimerDoc.data()?.currentInTime;
        if (inTimeData) {
          const now = new Date();
          const start = new Date(inTimeData.timestamp);
          const diffMs = now - start;
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
          elapsedTime.value = `${hours}h ${minutes}m ${seconds}s`;
        }
      }
    };

    const recordTime = async () => {
      loading.value.inOut = true;
      try {
        if (!todayAttendance.value) {
          await store.dispatch('recordInTime');
          if (!timerInterval) timerInterval = setInterval(updateElapsedTime, 1000);
        } else if (!todayAttendance.value.outTime) {
          await store.dispatch('recordOutTime');
          clearInterval(timerInterval);
          timerInterval = null;
          elapsedTime.value = '';
        }
        error.value = '';
      } catch (err) {
        error.value = err.message || 'Failed to record time';
      } finally {
        loading.value.inOut = false;
      }
    };

    const saveEdit = async () => {
      loading.value.edit = true;
      try {
        if (!todayAttendance.value) throw new Error('No attendance record to edit');
        const inTime = editInTime.value || todayAttendance.value.inTime;
        const outTime = todayAttendance.value.outTime || null;
        await store.dispatch('editAttendance', { attendanceId: todayAttendance.value.id, inTime, outTime });
        editInTime.value = '';
        error.value = '';
      } catch (err) {
        error.value = err.message || 'Failed to edit attendance';
      } finally {
        loading.value.edit = false;
      }
    };

    const logout = async () => {
      loading.value.logout = true;
      try {
        await store.dispatch('logout');
        clearInterval(timerInterval);
        timerInterval = null;
        router.push('/login');
      } catch (err) {
        error.value = err.message || 'Failed to logout';
      } finally {
        loading.value.logout = false;
      }
    };

    const formatDate = (date) => {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    };

    const calculateWorkingTime = (record) => {
      if (!record.inTime || !record.outTime) return 'N/A';
      const [inHours, inMinutes, inSeconds] = record.inTime.split(/:| /).map((v, i) => i < 2 ? parseInt(v) : v === 'PM' ? parseInt(record.inTime.split(':')[0]) + 12 : parseInt(record.inTime.split(':')[0]));
      const [outHours, outMinutes, outSeconds] = record.outTime.split(/:| /).map((v, i) => i < 2 ? parseInt(v) : v === 'PM' ? parseInt(record.outTime.split(':')[0]) + 12 : parseInt(record.outTime.split(':')[0]));
      const inTime = new Date(0, 0, 0, inHours, inMinutes);
      const outTime = new Date(0, 0, 0, outHours, outMinutes);
      const diffMs = outTime - inTime;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    };

    const paddedDaysInMonth = computed(() => {
      const date = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1);
      const days = [];
      const firstDay = date.getDay();
      for (let i = 0; i < firstDay; i++) days.push(null);
      const month = date.getMonth();
      while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
      }
      return days;
    });

    const currentMonthYear = computed(() => 
      currentDate.value.toLocaleString('default', { month: 'long', year: 'numeric' }));

    const getDayClass = (day) => {
      if (!day) return ['empty'];
      const classes = [];
      const today = new Date();
      if (day.toDateString() === today.toDateString()) classes.push('today');
      if (day.getDay() === 0 || day.getDay() === 6) classes.push('weekend');
      if (hasAttendance(day)) {
        const record = attendance.value.find(a => new Date(a.date).toDateString() === day.toDateString());
        if (record) {
          classes.push('present');
          if (record.inTime && !record.outTime) classes.push('in-only');
        }
      } else if (isHoliday(day)) classes.push('holiday');
      return classes;
    };

    const isHoliday = (day) => day && holidays.value.some(h => new Date(h.date).toDateString() === day.toDateString());
    const hasAttendance = (day) => day && attendance.value.some(a => new Date(a.date).toDateString() === day.toDateString());

    const toggleHoliday = (day) => {
      if (!day) return;
      selectedDate.value = isHoliday(day) && !hasAttendance(day) ? null : day;
      holidayDesc.value = '';
    };

    const addHoliday = async () => {
      if (!holidayDesc.value || !selectedDate.value) return;
      loading.value.holiday = true;
      try {
        await store.dispatch('addHoliday', { date: selectedDate.value, description: holidayDesc.value });
        holidayDesc.value = '';
        selectedDate.value = null;
      } catch (err) {
        error.value = err.message || 'Failed to add holiday';
      } finally {
        loading.value.holiday = false;
      }
    };

    const prevMonth = () => currentDate.value = new Date(currentDate.value.setMonth(currentDate.value.getMonth() - 1));
    const nextMonth = () => currentDate.value = new Date(currentDate.value.setMonth(currentDate.value.getMonth() + 1));

    const downloadPDF = async () => {
      loading.value.pdf = true;
      try {
        const doc = new jsPDF();
        doc.text(`Attendance Report - ${currentMonthYear.value}`, 14, 15);
        const firstDay = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1);
        const lastDay = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 0);
        const tableData = [];
        for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toDateString();
          const attendanceRecord = attendance.value.find(r => new Date(r.date).toDateString() === dateStr);
          const holidayRecord = holidays.value.find(h => new Date(h.date).toDateString() === dateStr);
          if (attendanceRecord) {
            tableData.push([formatDate(d), attendanceRecord.inTime || 'N/A', attendanceRecord.outTime || 'N/A', calculateWorkingTime(attendanceRecord)]);
          } else if (holidayRecord) {
            tableData.push([formatDate(d), 'Holiday', 'Holiday', '-']);
          } else {
            tableData.push([formatDate(d), 'N/A', 'N/A', '-']);
          }
        }
        autoTable(doc, {
          startY: 25,
          head: [['Date', 'In Time', 'Out Time', 'Working Time']],
          body: tableData,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [52, 152, 219] },
          alternateRowStyles: { fillColor: [245, 245, 245] }
        });
        doc.save(`attendance_${currentMonthYear.value}.pdf`);
      } catch (err) {
        error.value = err.message || 'Failed to generate PDF';
        console.error('PDF generation error:', err);
      } finally {
        loading.value.pdf = false;
      }
    };

    const deleteUser = async (userId) => {
      loading.value.delete = userId;
      try {
        await store.dispatch('deleteUser', userId);
        error.value = '';
      } catch (err) {
        error.value = err.message || 'Failed to delete user';
      } finally {
        loading.value.delete = null;
      }
    };

    onMounted(async () => {
      try {
        await new Promise((resolve) => {
          auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
              if (!store.state.user) {
                const userData = await store.dispatch('fetchUserData', firebaseUser.uid);
                if (userData.currentInTime) {
                  store.commit('setCurrentInTime', userData.currentInTime.time);
                  timerInterval = setInterval(updateElapsedTime, 1000);
                }
              }
              await Promise.all([
                store.dispatch('fetchAttendance'),
                store.dispatch('fetchHolidays'),
                firebaseUser.email === 'admin@atul.fun' && store.dispatch('fetchAllUsers')
              ].filter(Boolean));
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

    onUnmounted(() => { if (timerInterval) clearInterval(timerInterval); });

    return {
      user, attendance, holidays, error, currentInTime, allUsers, isAdmin, loading, elapsedTime,
      todayAttendance, recordTime, saveEdit, editInTime, logout, formatDate, calculateWorkingTime,
      paddedDaysInMonth, currentMonthYear, getDayClass, isHoliday, hasAttendance, toggleHoliday,
      addHoliday, prevMonth, nextMonth, holidayDesc, selectedDate, downloadPDF, deleteUser
    };
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600&display=swap');

* { font-family: 'Lexend', sans-serif; box-sizing: border-box; }

.dashboard { padding: 1rem; max-width: 1200px; margin: 0 auto; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); min-height: 100vh; }

.dashboard-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; background: rgba(255, 255, 255, 0.9); padding: 1rem; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }

.user-info { margin-bottom: 1rem; }
.user-info h2 { margin: 0; font-weight: 500; color: #2c3e50; font-size: 1.5rem; }
.department { margin: 0.5rem 0 0; color: #7f8c8d; }

.logout-btn { padding: 0.75rem 1.5rem; background: #e74c3c; border: none; border-radius: 25px; color: white; cursor: pointer; transition: background 0.3s ease; position: relative; -webkit-tap-highlight-color: transparent; }
.logout-btn:hover:not(:disabled), .logout-btn:active:not(:disabled) { background: #c0392b; }
.logout-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.attendance-controls { background: rgba(255, 255, 255, 0.9); padding: 1rem; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin-bottom: 1.5rem; text-align: center; }

.action-btn { padding: 1rem 2rem; border: none; border-radius: 25px; color: white; font-weight: 500; cursor: pointer; transition: background 0.3s ease; width: 100%; max-width: 200px; position: relative; -webkit-tap-highlight-color: transparent; }
.in-btn { background: #2ecc71; }
.in-btn:hover:not(:disabled), .in-btn:active:not(:disabled) { background: #27ae60; }
.action-btn:not(.in-btn) { background: #e74c3c; }
.action-btn:not(.in-btn):hover:not(:disabled), .action-btn:not(.in-btn):active:not(:disabled) { background: #c0392b; }
.action-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.time-display { margin: 1rem 0 0; color: #2c3e50; }
.time-display p { margin: 0.5rem 0; }
.error { color: #e74c3c; margin: 1rem 0 0; }

.edit-form { margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
.edit-form input { padding: 0.75rem; border: none; border-radius: 10px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); flex: 1; min-width: 200px; }
.edit-form button { padding: 0.75rem 1.5rem; background: #3498db; border: none; border-radius: 25px; color: white; cursor: pointer; transition: background 0.3s ease; position: relative; -webkit-tap-highlight-color: transparent; }
.edit-form button:hover:not(:disabled), .edit-form button:active:not(:disabled) { background: #2980b9; }
.edit-form button:disabled { opacity: 0.6; cursor: not-allowed; }

.calendar-section { background: rgba(255, 255, 255, 0.9); padding: 1rem; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin-bottom: 1.5rem; }

h3 { color: #2c3e50; margin-bottom: 1rem; font-size: 1.25rem; }

.calendar-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-bottom: 1rem; justify-content: center; }

.nav-btn { width: 40px; height: 40px; border-radius: 50%; border: none; background: #3498db; color: white; cursor: pointer; transition: background 0.3s ease; -webkit-tap-highlight-color: transparent; }
.nav-btn:hover, .nav-btn:active { background: #2980b9; }

.month-year { font-weight: 500; color: #2c3e50; margin: 0 0.5rem; }

.pdf-btn { padding: 0.5rem 1rem; border-radius: 25px; border: none; background: #9b59b6; color: white; cursor: pointer; transition: background 0.3s ease; position: relative; -webkit-tap-highlight-color: transparent; }
.pdf-btn:hover:not(:disabled), .pdf-btn:active:not(:disabled) { background: #8e44ad; }
.pdf-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.25rem; }

.day-header { text-align: center; padding: 0.5rem; background: #ecf0f1; border-radius: 10px; font-weight: 500; color: #7f8c8d; }

.day { padding: 0.75rem; text-align: center; border-radius: 10px; background: white; cursor: pointer; transition: background 0.3s ease; position: relative; min-height: 50px; -webkit-tap-highlight-color: transparent; }
.day:hover, .day:active { box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }

.empty { background: transparent; }
.today { background: #f5e6cc; }
.weekend { background: #87ceeb; }
.present { background: #ffff99; }
.in-only { background: #ffa500; }
.holiday { background: #90ee90; }

.day-number { font-weight: 500; }
.holiday-marker, .present-marker { position: absolute; font-size: 0.8rem; color: #7f8c8d; }
.holiday-marker { top: 5px; right: 5px; }
.present-marker { bottom: 5px; right: 5px; }

.holiday-form { margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
.holiday-form input { padding: 0.75rem; border: none; border-radius: 10px; flex: 1; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); min-width: 200px; }
.holiday-form button { padding: 0.75rem 1.5rem; border: none; border-radius: 10px; background: #3498db; color: white; cursor: pointer; transition: background 0.3s ease; position: relative; -webkit-tap-highlight-color: transparent; }
.holiday-form button:hover:not(:disabled), .holiday-form button:active:not(:disabled) { background: #2980b9; }
.holiday-form button:disabled { opacity: 0.6; cursor: not-allowed; }

.color-legend { margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; }
.legend-item { display: flex; align-items: center; gap: 0.5rem; }
.color-box { width: 20px; height: 20px; border-radius: 4px; }
.sky-blue { background: #87ceeb; }
.yellow { background: #ffff99; }
.orange { background: #ffa500; }
.green { background: #90ee90; }
.beige { background: #f5e6cc; }

.records-section, .users-section { background: rgba(255, 255, 255, 0.9); padding: 1rem; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin-bottom: 1.5rem; }

table { width: 100%; border-collapse: separate; border-spacing: 0 0.5rem; }
th { background: #ecf0f1; padding: 0.75rem; color: #2c3e50; font-weight: 500; }
td { padding: 0.75rem; background: white; color: #34495e; }
tr { transition: all 0.3s ease; }
tbody tr:hover { transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }

.delete-btn { padding: 0.5rem 1rem; background: #e74c3c; border: none; border-radius: 25px; color: white; cursor: pointer; transition: background 0.3s ease; position: relative; -webkit-tap-highlight-color: transparent; }
.delete-btn:hover:not(:disabled), .delete-btn:active:not(:disabled) { background: #c0392b; }
.delete-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.loading-circle { display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top-color: white; animation: spin 1s ease-in-out infinite; }

@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-enter-active, .slide-leave-active { transition: all 0.3s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-10px); }

@media (max-width: 768px) {
  .dashboard { padding: 0.5rem; }
  .dashboard-header { flex-direction: column; align-items: flex-start; }
  .user-info h2 { font-size: 1.25rem; }
  .action-btn { padding: 0.75rem 1.5rem; }
  .calendar { grid-template-columns: repeat(7, 1fr); gap: 0.1rem; }
  .day { padding: 0.5rem; min-height: 40px; }
  .day-number { font-size: 0.9rem; }
  th, td { padding: 0.5rem; font-size: 0.9rem; }
}

@media (max-width: 480px) {
  .calendar { grid-template-columns: repeat(7, 1fr); }
  .day { padding: 0.3rem; min-height: 35px; }
  .day-number { font-size: 0.8rem; }
  .holiday-marker, .present-marker { font-size: 0.6rem; }
  .nav-btn { width: 30px; height: 30px; }
  .pdf-btn, .delete-btn { padding: 0.4rem 0.8rem; }
}
</style>