(function () {
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBKnvObu_hob-RNi6MDZO7K7Zd00744w6g",
  authDomain: "territorio-timirim.firebaseapp.com",
  databaseURL: "https://territorio-timirim-default-rtdb.firebaseio.com",
  projectId: "territorio-timirim",
  storageBucket: "territorio-timirim.firebasestorage.app",
  messagingSenderId: "309618565543",
  appId: "1:309618565543:web:9671ff7cfc24f34ee19682",
  measurementId: "G-CW0KC31FTV"
};

  // Initialize Firebase
  const app = firebase.initializeApp(firebaseConfig);
  window.db = firebase.firestore();
  window.storage = firebase.storage();
})();


