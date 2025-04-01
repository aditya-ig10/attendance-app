// src/store/index.js
import { createStore } from 'vuex';
import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from '../firebase';
import { collection, addDoc, getDocs, query, where, setDoc, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';

export default createStore({
  state: {
    user: null,
    attendance: [],
    holidays: [],
    currentInTime: null,
    allUsers: []
  },
  mutations: {
    setUser(state, user) { state.user = user; },
    setAttendance(state, attendance) { state.attendance = attendance; },
    setHolidays(state, holidays) { state.holidays = holidays; },
    setCurrentInTime(state, time) { state.currentInTime = time; },
    setAllUsers(state, users) { state.allUsers = users; }
  },
  actions: {
    async fetchUserData({ commit }, uid) {
      try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = { uid, ...userSnap.data() };
          commit('setUser', userData);
          return userData;
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    },
    async login({ commit, dispatch }, { email, password }) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userData = await dispatch('fetchUserData', userCredential.user.uid);
        if (userData) commit('setUser', userData);
        return userData;
      } catch (error) {
        throw new Error(error.message);
      }
    },
    async signup({ commit }, { name, department, email, password }) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userData = { uid: userCredential.user.uid, name, department, email };
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name, department, email, createdAt: new Date().toISOString()
        });
        commit('setUser', userData);
        return userData;
      } catch (error) {
        throw new Error(error.message);
      }
    },
    async logout({ commit }) {
      await signOut(auth);
      commit('setUser', null);
      commit('setCurrentInTime', null);
      commit('setAllUsers', []);
    },
    async recordInTime({ commit, state, dispatch }) {
      try {
        if (!state.user?.uid) throw new Error('No user logged in');
        const today = new Date().toISOString().split('T')[0];
        const q = query(collection(db, 'attendance'), where('userId', '==', state.user.uid), where('date', '==', today));
        const existing = await getDocs(q);
        if (!existing.empty) throw new Error('Attendance already recorded for today');
        
        const time = new Date().toLocaleTimeString();
        const timestamp = new Date().toISOString();
        await setDoc(doc(db, 'users', state.user.uid), { currentInTime: { time, timestamp } }, { merge: true });
        commit('setCurrentInTime', time);
        await addDoc(collection(db, 'attendance'), {
          userId: state.user.uid,
          inTime: time,
          date: today
        });
        await dispatch('fetchAttendance');
      } catch (error) {
        throw error;
      }
    },
    async recordOutTime({ commit, state, dispatch }) {
      try {
        if (!state.user?.uid) throw new Error('No user logged in');
        if (!state.currentInTime) throw new Error('No in-time recorded');
        const today = new Date().toISOString().split('T')[0];
        const q = query(collection(db, 'attendance'), where('userId', '==', state.user.uid), where('date', '==', today));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) throw new Error('No attendance record for today');
        
        const docId = querySnapshot.docs[0].id;
        const outTime = new Date().toLocaleTimeString();
        await updateDoc(doc(db, 'attendance', docId), { outTime });
        await setDoc(doc(db, 'users', state.user.uid), { currentInTime: null }, { merge: true });
        commit('setCurrentInTime', null);
        await dispatch('fetchAttendance');
      } catch (error) {
        throw error;
      }
    },
    async editAttendance({ dispatch }, { attendanceId, inTime, outTime }) {
      try {
        await updateDoc(doc(db, 'attendance', attendanceId), { inTime, outTime });
        await dispatch('fetchAttendance');
      } catch (error) {
        throw new Error('Failed to edit attendance: ' + error.message);
      }
    },
    async fetchAttendance({ commit, state }) {
      try {
        if (!state.user?.uid) return;
        const q = query(collection(db, 'attendance'), where('userId', '==', state.user.uid));
        const querySnapshot = await getDocs(q);
        const attendance = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        commit('setAttendance', attendance);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      }
    },
    async addHoliday({ dispatch }, { date, description }) {
      try {
        await addDoc(collection(db, 'holidays'), { date: date.toISOString(), description, createdBy: auth.currentUser.uid });
        await dispatch('fetchHolidays');
      } catch (error) {
        console.error('Error adding holiday:', error);
      }
    },
    async fetchHolidays({ commit }) {
      try {
        const querySnapshot = await getDocs(collection(db, 'holidays'));
        const holidays = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        commit('setHolidays', holidays);
      } catch (error) {
        console.error('Error fetching holidays:', error);
      }
    },
    async fetchAllUsers({ commit }) {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        commit('setAllUsers', users);
      } catch (error) {
        console.error('Error fetching all users:', error);
      }
    },
    async deleteUser({ dispatch }, userId) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        const q = query(collection(db, 'attendance'), where('userId', '==', userId));
        const attendanceDocs = await getDocs(q);
        for (const docSnap of attendanceDocs.docs) {
          await deleteDoc(doc(db, 'attendance', docSnap.id));
        }
        await dispatch('fetchAllUsers');
      } catch (error) {
        throw new Error('Failed to delete user: ' + error.message);
      }
    }
  }
});