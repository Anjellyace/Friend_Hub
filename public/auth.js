// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDRqAqQbKYopqVEuKuZb0tdosIQ3cb4G08",
    authDomain: "friend-hub-60b27.firebaseapp.com",
    projectId: "friend-hub-60b27",
    storageBucket: "friend-hub-60b27.appspot.com",
    messagingSenderId: "539531733770",
    appId: "1:539531733770:web:a4c0a17ca00905a22fa8f3"
  };
  
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  document.addEventListener("DOMContentLoaded", () => {
    // 🔐 Protect /home and /profile
    const protectedRoutes = ["/home", "/profile"];
    if (protectedRoutes.includes(window.location.pathname)) {
      firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
          alert("Please log in to view this page.");
          window.location.href = "/";
        }
      });
    }
        // 👤 Load profile data
    if (window.location.pathname === "/profile") {
      auth.onAuthStateChanged((user) => {
        if (user) {
          const userRef = db.collection("users").doc(user.uid);
          userRef.get()
            .then((doc) => {
              if (doc.exists) {
                const data = doc.data();
                console.log("Loaded user data:", data); // ✅ log for debug
                document.getElementById("profile-username").textContent = data.username || "N/A";
                document.getElementById("profile-email").textContent = data.email || "N/A";

                const date = data.createdAt?.toDate();
                document.getElementById("profile-joined").textContent = date
                  ? date.toLocaleDateString()
                  : "Unknown";

                if (data.username) {
                  localStorage.setItem("username", data.username);
            }

              } else {
                alert("User profile not found.");
              }
            })
            .catch((err) => {
              console.error("❌ Error fetching profile:", err); // ✅ show full error
              alert("Error loading profile.");
            });
        } else {
          alert("Please log in to view your profile.");
          window.location.href = "/";
        }
      });
    }

      
    // 🔑 Login handler
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        auth.signInWithEmailAndPassword(email, password)
          .then((cred) => {
            const uid = cred.user.uid;
            return db.collection("users").doc(uid).get();
          })
          .then((doc) => {
            if (doc.exists) {
              const username = doc.data().username;
              if (username) {
                localStorage.setItem("username", username); // ✅ Store it
              }
            }
            window.location.href = "/home"; // ✅ Go to home after storing
          })
          .catch((err) => alert("Login failed: " + err.message));
      });
    }

    // ✍️ Signup handler
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
      signupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("signup-name").value;
        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;
        const confirm = document.getElementById("confirm-password").value;
  
        console.log("Signup form submitted");
        console.log("Username is:", username);
  
        if (password !== confirm) {
          alert("Passwords do not match.");
          return;
        }
  
        auth.createUserWithEmailAndPassword(email, password)
        .then((cred) => {
          console.log("✅ User created:", cred.user.uid);
          return db.collection("users").doc(cred.user.uid).set({
            username,
            email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        })
        .then(() => {
          console.log("✅ Firestore write succeeded");
          alert("Signup complete!");
          setTimeout(() => {
            window.location.href = "/home";
          }, 100);
        })
        .catch((err) => {
          console.error("🔥 Signup failed:", err.code, err.message);
          alert("Signup failed: " + err.message);
        });
      });
    }
  });
  