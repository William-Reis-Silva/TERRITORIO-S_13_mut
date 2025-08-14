(function () {
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyExampleKey1234567890",
  authDomain: "meu-projeto.firebaseapp.com",
  projectId: "meu-projeto",
  storageBucket: "meu-projeto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcd1234efgh5678",
  measurementId: "G-ABCDEFG123" // opcional, usado no Analytics
};

  // Initialize Firebase
  const app = firebase.initializeApp(firebaseConfig);
  window.db = firebase.firestore();
  window.storage = firebase.storage();
})();


