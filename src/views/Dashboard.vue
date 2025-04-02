<!-- Dashboard.vue -->
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
        :class="['action-btn', { 'in-btn': !currentInTime }]" 
        @click="currentInTime ? recordOutTime() : recordInTime()"
        :disabled="loading.inOut || (hasTodayRecord && !currentInTime)"
      >
        <span v-if="!loading.inOut">{{ currentInTime ? 'Out' : 'In' }}</span>
        <span v-else class="loading-circle"></span>
      </button>
      <transition name="fade">
        <p v-if="currentInTime" class="in-time">In: {{ currentInTime }} ({{ elapsedTime }})</p>
      </transition>
      <transition name="fade">
        <p v-if="error" class="error">{{ error }}</p>
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
        <div class="day-header" v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day">
          {{ day }}
        </div>
        <div 
          v-for="(day, index) in paddedDaysInMonth" 
          :key="index" 
          :class="['day', getDayClass(day)]"
          @click="isAdmin && toggleHoliday(day)"
          @mouseover="showHolidayDesc(day)"
          @mouseleave="holidayTooltip = null"
        >
          <span v-if="day" class="day-number">{{ day.getDate() }}</span>
          <span v-if="isHoliday(day)" class="holiday-marker">H</span>
          <span v-if="hasAttendance(day)" class="present-marker">P</span>
          <div v-if="holidayTooltip && holidayTooltip.date === day.toDateString()" class="holiday-tooltip">
            {{ holidayTooltip.description }}
          </div>
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

    <section class="records-section" v-if="sortedAttendance.length">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>In Time</th>
            <th>Out Time</th>
            <th>Working Time</th>
            <th class="mobile-hidden">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in sortedAttendance" :key="record.id">
            <td>{{ formatDate(record.date) }}</td>
            <td>
              <span v-if="!editingRecord || editingRecord.id !== record.id">{{ record.inTime }}</span>
              <input v-else v-model="editingRecord.inTime" type="time" />
            </td>
            <td>
              <span v-if="!editingRecord || editingRecord.id !== record.id">{{ record.outTime }}</span>
              <input v-else v-model="editingRecord.outTime" type="time" />
            </td>
            <td>{{ calculateWorkingTime(record) }}</td>
            <td class="action-cell">
              <button 
                v-if="!editingRecord || editingRecord.id !== record.id" 
                @click="startEditing(record)" 
                :disabled="!isEditable(record)"
                class="edit-btn"
              >
                <span class="mobile-hidden">Edit</span>
                <span class="mobile-only">✏️</span>
              </button>
              <button 
                v-else 
                @click="saveEdit(record)" 
                :disabled="loading.edit"
                class="save-btn"
              >
                <span v-if="!loading.edit">Save</span>
                <span v-else class="loading-circle"></span>
              </button>
              <button 
                @click="deleteRecord(record)" 
                :disabled="loading.delete || (editingRecord && editingRecord.id === record.id)"
                class="delete-btn"
              >
                <span class="mobile-hidden">Delete</span>
                <span class="mobile-only">🗑️</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-if="isAdmin" class="users-section">
      <h3>All Users</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Department</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in allUsers" :key="user.id">
            <td>{{ user.name }}</td>
            <td>{{ user.department }}</td>
            <td>{{ user.email }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script>
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ref, onMounted, computed, onUnmounted, onActivated } from 'vue';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
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
    const editingRecord = ref(null);
    const holidayTooltip = ref(null);
    const loading = ref({
      inOut: false,
      logout: false,
      pdf: false,
      holiday: false,
      edit: false,
      delete: false
    });
    const elapsedTime = ref('');
    let timerInterval = null;

    const user = computed(() => store.state.user);
    const attendance = computed(() => store.state.attendance);
    const sortedAttendance = computed(() => 
      [...attendance.value].sort((a, b) => new Date(b.date) - new Date(a.date))
    );
    const holidays = computed(() => store.state.holidays);
    const currentInTime = computed(() => store.state.currentInTime);
    const allUsers = computed(() => store.state.allUsers);
    const isAdmin = computed(() => store.state.user?.email === 'admin@atul.fun');
    const hasTodayRecord = computed(() => 
      attendance.value.some(record => 
        new Date(record.date).toDateString() === new Date().toDateString()
      )
    );

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

    const recordInTime = async () => {
      if (hasTodayRecord.value) {
        error.value = 'You have already recorded attendance for today';
        return;
      }
      loading.value.inOut = true;
      try {
        const time = new Date().toLocaleTimeString();
        const timestamp = new Date().toISOString();
        await setDoc(doc(db, 'users', user.value.uid), {
          ...user.value,
          currentInTime: { time, timestamp }
        }, { merge: true });
        store.commit('setCurrentInTime', time);
        if (!timerInterval) {
          timerInterval = setInterval(updateElapsedTime, 1000);
        }
        error.value = '';
      } catch (err) {
        error.value = err.message || 'Failed to record in time';
      } finally {
        loading.value.inOut = false;
      }
    };

    const recordOutTime = async () => {
      loading.value.inOut = true;
      try {
        if (!user.value?.uid) throw new Error('No user logged in');
        if (!currentInTime.value) throw new Error('No in-time recorded');
        const outTime = new Date().toLocaleTimeString();
        await store.dispatch('recordOutTime');
        await setDoc(doc(db, 'users', user.value.uid), {
          ...user.value,
          currentInTime: null
        }, { merge: true });
        clearInterval(timerInterval);
        timerInterval = null;
        elapsedTime.value = '';
      } catch (err) {
        error.value = err.message || 'Failed to record out time';
      } finally {
        loading.value.inOut = false;
      }
    };

    const autoRecordOutTime = async () => {
      if (currentInTime.value && !hasTodayRecord.value) {
        await recordOutTime();
      }
    };

    const checkAutoOutTime = () => {
      const now = new Date();
      if (now.getHours() === 23 && now.getMinutes() === 59) {
        autoRecordOutTime();
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
      const inTime = new Date(`${record.date.split('T')[0]} ${record.inTime}`);
      const outTime = new Date(`${record.date.split('T')[0]} ${record.outTime}`);
      const diffMs = outTime - inTime;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    };

    const isEditable = (record) => {
      const recordDate = new Date(record.date).toDateString();
      const today = new Date().toDateString();
      return recordDate === today;
    };

    const startEditing = (record) => {
      editingRecord.value = { ...record };
    };

    const saveEdit = async (record) => {
      loading.value.edit = true;
      try {
        const updatedRecord = {
          ...record,
          inTime: editingRecord.value.inTime,
          outTime: editingRecord.value.outTime
        };
        await updateDoc(doc(db, 'attendance', record.id), {
          inTime: updatedRecord.inTime,
          outTime: updatedRecord.outTime
        });
        await store.dispatch('fetchAttendance');
        editingRecord.value = null;
      } catch (err) {
        error.value = err.message || 'Failed to update record';
      } finally {
        loading.value.edit = false;
      }
    };

    const deleteRecord = async (record) => {
      if (!confirm('Are you sure you want to delete this record?')) return;
      loading.value.delete = true;
      try {
        await deleteDoc(doc(db, 'attendance', record.id));
        await store.dispatch('fetchAttendance');
      } catch (err) {
        error.value = err.message || 'Failed to delete record';
      } finally {
        loading.value.delete = false;
      }
    };

    const paddedDaysInMonth = computed(() => {
      const date = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1);
      const days = [];
      const firstDay = date.getDay();
      for (let i = 0; i < firstDay; i++) {
        days.push(null);
      }
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
      if (day.getDay() === 0 || day.getDay() === 6) classes.push('weekend');
      if (hasAttendance(day)) {
        const record = attendance.value.find(a => 
          new Date(a.date).toDateString() === day.toDateString()
        );
        if (record) {
          classes.push('present');
          if (record.inTime && !record.outTime) classes.push('in-only');
        }
      } else if (isHoliday(day)) {
        classes.push('holiday');
      }
      return classes;
    };

    const isHoliday = (day) => 
      day && holidays.value.some(h => new Date(h.date).toDateString() === day.toDateString());

    const hasAttendance = (day) => 
      day && attendance.value.some(a => new Date(a.date).toDateString() === day.toDateString());

    const showHolidayDesc = (day) => {
      if (!day) {
        holidayTooltip.value = null;
        return;
      }
      const holiday = holidays.value.find(h => new Date(h.date).toDateString() === day.toDateString());
      if (holiday) {
        holidayTooltip.value = { date: day.toDateString(), description: holiday.description };
      } else {
        holidayTooltip.value = null;
      }
    };

    const toggleHoliday = (day) => {
      if (!day) return;
      selectedDate.value = isHoliday(day) && !hasAttendance(day) ? null : day;
      holidayDesc.value = '';
    };

    const addHoliday = async () => {
      if (!holidayDesc.value || !selectedDate.value) return;
      loading.value.holiday = true;
      try {
        await store.dispatch('addHoliday', {
          date: selectedDate.value,
          description: holidayDesc.value
        });
        holidayDesc.value = '';
        selectedDate.value = null;
      } catch (err) {
        error.value = err.message || 'Failed to add holiday';
      } finally {
        loading.value.holiday = false;
      }
    };

    const prevMonth = () => {
      currentDate.value = new Date(currentDate.value.setMonth(currentDate.value.getMonth() - 1));
    };

    const nextMonth = () => {
      currentDate.value = new Date(currentDate.value.setMonth(currentDate.value.getMonth() + 1));
    };

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
          const attendanceRecord = attendance.value.find(r => 
            new Date(r.date).toDateString() === dateStr
          );
          const holidayRecord = holidays.value.find(h => 
            new Date(h.date).toDateString() === dateStr
          );
          
          if (attendanceRecord) {
            tableData.push([
              formatDate(d),
              attendanceRecord.inTime || 'N/A',
              attendanceRecord.outTime || 'N/A',
              calculateWorkingTime(attendanceRecord)
            ]);
          } else if (holidayRecord) {
            tableData.push([
              formatDate(d),
              'Holiday',
              'Holiday',
              holidayRecord.description || '-'
            ]);
          } else {
            tableData.push([
              formatDate(d),
              'N/A',
              'N/A',
              '-'
            ]);
          }
        }

        autoTable(doc, {
          startY: 25,
          head: [['Date', 'In Time', 'Out Time', 'Description/Working Time']],
          body: tableData,
          styles: { fontSize: 10, halign: 'center' },
          headStyles: { fillColor: [52, 152, 219], halign: 'center' },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' }
          }
        });

        doc.save(`attendance_${currentMonthYear.value}.pdf`);
      } catch (err) {
        error.value = err.message || 'Failed to generate PDF';
      } finally {
        loading.value.pdf = false;
      }
    };

    const refreshData = async () => {
      try {
        await Promise.all([
          store.dispatch('fetchAttendance'),
          store.dispatch('fetchHolidays'),
          isAdmin.value && store.dispatch('fetchAllUsers')
        ].filter(Boolean));
      } catch (err) {
        error.value = 'Failed to refresh data';
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
              await refreshData();
              setInterval(checkAutoOutTime, 60000);
            } else {
              router.push('/login');
            }
            resolve();
          });
        });
      } catch (err) {
        error.value = 'Failed to load dashboard';
      }
    });

    onActivated(() => {
      refreshData(); // Refresh data when component is reactivated
    });

    onUnmounted(() => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    });

    return {
      user,
      attendance,
      sortedAttendance,
      holidays,
      error,
      currentInTime,
      allUsers,
      isAdmin,
      loading,
      elapsedTime,
      recordInTime,
      recordOutTime,
      logout,
      formatDate,
      calculateWorkingTime,
      paddedDaysInMonth,
      currentMonthYear,
      getDayClass,
      isHoliday,
      hasAttendance,
      toggleHoliday,
      addHoliday,
      prevMonth,
      nextMonth,
      holidayDesc,
      selectedDate,
      downloadPDF,
      editingRecord,
      startEditing,
      saveEdit,
      deleteRecord,
      isEditable,
      showHolidayDesc,
      holidayTooltip,
      hasTodayRecord
    };
  }
};
</script>
<style src="./DashboardStyles.css"></style>