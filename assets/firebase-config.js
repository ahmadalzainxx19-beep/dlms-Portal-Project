<script type="module">
  // Import the functions you need from the SDKs you need
    import {initializeApp} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
    import {getAnalytics} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";
    // TODO: Add SDKs for Firebase products that you want to use
    // https://firebase.google.com/docs/web/setup#available-libraries

    // Your web app's Firebase configuration
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
    const firebaseConfig = {
        apiKey: "AIzaSyB7jllMM4iczgD08Hy2wTBluHklkhPWxQs",
    authDomain: "ddl-portal.firebaseapp.com",
    projectId: "ddl-portal",
    storageBucket: "ddl-portal.firebasestorage.app",
    messagingSenderId: "166039164050",
    appId: "1:166039164050:web:d1609102974717f392424b",
    measurementId: "G-0W9KQV2HZR"
  };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
</script>