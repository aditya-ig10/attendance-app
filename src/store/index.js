// src/store/index.js
import { createStore } from 'vuex';
import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from '../firebase';
import { collection, addDoc, getDocs, query, where, setDoc, doc, getDoc } from 'firebase/firestore';

export default createStore({
  state: {
    user: null,
    attendance: [],
    holidays: [],
    currentInTime: null
  },
  mutations: {
    setUser(state, user) {
      state.user = user;
    },
    setAttendance(state, attendance) {
      state.attendance = attendance;
    },
    setHolidays(state, holidays) {
      state.holidays = holidays;
    },
    setCurrentInTime(state, time) {
      state.currentInTime = time;
    }
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
          name,
          department,
          email,
          createdAt: new Date().toISOString()
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
    },
    async recordInTime({ commit, state }) {
      try {
        if (!state.user?.uid) throw new Error('No user logged in');
        const time = new Date().toLocaleTimeString();
        commit('setCurrentInTime', time);
        return time;
      } catch (error) {
        throw error;
      }
    },
    async recordOutTime({ commit, state, dispatch }) {
      try {
        if (!state.user?.uid) throw new Error('No user logged in');
        if (!state.currentInTime) throw new Error('No in-time recorded');
        const outTime = new Date().toLocaleTimeString();
        await addDoc(collection(db, 'attendance'), {
          userId: state.user.uid,
          inTime: state.currentInTime,
          outTime,
          date: new Date().toISOString()
        });
        commit('setCurrentInTime', null);
        await dispatch('fetchAttendance');
      } catch (error) {
        throw error;
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
        await addDoc(collection(db, 'holidays'), {
          date: date.toISOString(),
          description,
          createdBy: auth.currentUser.uid
        });
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
    }
  }
});