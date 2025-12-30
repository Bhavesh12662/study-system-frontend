// ================= BASE URL OF BACKEND =================
const API = "https://study-system-backend-1.onrender.com";

// ================= ELEMENTS =================
const presentBtn = document.getElementById("presentBtn");
const absentBtn = document.getElementById("absentBtn");
const attendanceStatus = document.getElementById("attendanceStatus");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const timerDisplay = document.getElementById("TimmerDisplay");

const subjectInput = document.getElementById("subjectInput");
const messageBox = document.getElementById("messageBox");
const summary = document.getElementById("summary");


// ================= LOAD SUMMARY =================
async function loadSummary() {
  summary.innerHTML = "Loading...";

  try {
    const res = await fetch(`${API}/study`);
    const data = await res.json();

    summary.innerHTML = "";

    data.forEach((s, index) => {
      const div = document.createElement("div");
      const mins = Math.floor(s.duration / (1000 * 60));
      div.textContent = `${index + 1}. ${s.subject} — ${mins} min`;
      summary.appendChild(div);
    });
  } catch (e) {
    summary.innerHTML = "Failed to load summary";
  }
}


// ================= ATTENDANCE =================
presentBtn.addEventListener("click", async () => {
  attendanceStatus.textContent = "Present";

  await saveAttendance("Present");
});

absentBtn.addEventListener("click", async () => {
  attendanceStatus.textContent = "Absent";

  await saveAttendance("Absent");
});

async function saveAttendance(status) {
  try {
    await fetch(`${API}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        date: new Date()
      }),
    });

    messageBox.textContent = `Attendance marked: ${status}`;
    loadWeeklyReport();

  } catch (e) {
    messageBox.textContent = "Failed to save attendance";
  }
}



// ================= STUDY TIMER =================
let startTime = null;
let timerInterval = null;

startBtn.addEventListener("click", () => {
  if (startTime !== null) return;

  startTime = Date.now();
  messageBox.textContent = "Study started";

  timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;

    const seconds = Math.floor(elapsed / 1000) % 60;
    const minutes = Math.floor(elapsed / (1000 * 60)) % 60;
    const hours = Math.floor(elapsed / (1000 * 60 * 60));

    timerDisplay.textContent =
      `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
  }, 1000);
});


stopBtn.addEventListener("click", async () => {
  if (startTime === null) return;

  clearInterval(timerInterval);

  const endTime = Date.now();
  const duration = endTime - startTime;
  const subject = subjectInput.value || "No Subject";

  try {
    await fetch(`${API}/study`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        startTime,
        endTime,
        duration
      }),
    });

    messageBox.textContent = "Study session saved";
  } catch {
    messageBox.textContent = "Failed to save study session";
  }

  startTime = null;
  timerDisplay.textContent = "00:00:00";

  loadSummary();
  loadWeeklyReport();
});



// ================= WEEKLY REPORT =================
async function loadWeeklyReport() {
  const last7 = Date.now() - 7 * 24 * 60 * 60 * 1000;

  try {
    // STUDY
    const studyRes = await fetch(`${API}/study`);
    const studyData = await studyRes.json();

    let totalMs = 0;

    studyData.forEach(s => {
      if (s.endTime >= last7) totalMs += s.duration;
    });

    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const mins = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));

    document.getElementById("weekStudy").textContent =
      `Study: ${hours} hr ${mins} min`;


    // ATTENDANCE
    const attRes = await fetch(`${API}/attendance`);
    const attData = await attRes.json();

    let days = new Set();

    attData.forEach(a => {
      const d = new Date(a.date);

      if (d.getTime() >= last7 && a.status === "Present") {
        days.add(d.toISOString().slice(0, 10));
      }
    });

    const presentDays = days.size;

    document.getElementById("weekAttendance").textContent =
      `Attendance: ${presentDays} / 7 days`;

    const percent = Math.min(100, Math.round((presentDays / 7) * 100));

    document.getElementById("weekPercentage").textContent =
      `Attendance %: ${percent}%`;

  } catch (e) {
    document.getElementById("weekStudy").textContent = "Failed to load report";
  }
}



// ================= INIT =================
loadSummary();
loadWeeklyReport();


// ================= AUTH (Login / Register) =================
function showMsg(el, msg, type = "error"){
  if(!el) return;
  el.textContent = msg;
  el.className = type === "error" ? "error" : "success";
}

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const msgEl = document.getElementById("loginMessage");

    if (!email || !password) return showMsg(msgEl, "Please fill all fields");

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) localStorage.setItem("token", data.token);
        showMsg(msgEl, "Login successful", "success");
        setTimeout(() => (window.location.href = "index.html"), 700);
        return;
      }

      // If backend doesn't provide auth endpoints, fallback to local mock
      if (res.status === 404) {
        const ok = localLogin(email, password);
        if (ok) {
          showMsg(msgEl, "Login (local) successful", "success");
          setTimeout(() => (window.location.href = "index.html"), 600);
          return;
        }
        return showMsg(msgEl, "Invalid credentials");
      }

      const err = await res.json().catch(() => ({}));
      showMsg(msgEl, err.message || "Login failed");
    } catch (e) {
      // network error -> try local fallback
      const ok = localLogin(email, password);
      if (ok) {
        showMsg(msgEl, "Login (local) successful", "success");
        setTimeout(() => (window.location.href = "index.html"), 600);
        return;
      }
      showMsg(msgEl, "Network error or backend unavailable");
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const confirm = document.getElementById("regConfirm").value;
    const msgEl = document.getElementById("registerMessage");

    if (!name || !email || !password || !confirm) return showMsg(msgEl, "Please fill all fields");
    if (password.length < 6) return showMsg(msgEl, "Password must be at least 6 characters");
    if (password !== confirm) return showMsg(msgEl, "Passwords do not match");

    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) localStorage.setItem("token", data.token);
        showMsg(msgEl, "Registration successful", "success");
        setTimeout(() => (window.location.href = "index.html"), 900);
        return;
      }

      // fallback to local registration if backend doesn't support auth
      if (res.status === 404) {
        const ok = localRegister(name, email, password);
        if (ok) {
          showMsg(msgEl, "Registered locally", "success");
          setTimeout(() => (window.location.href = "index.html"), 900);
          return;
        }
        return showMsg(msgEl, "Registration failed (email taken)");
      }

      const err = await res.json().catch(() => ({}));
      showMsg(msgEl, err.message || "Registration failed");
    } catch (e) {
      // network error -> try local fallback
      const ok = localRegister(name, email, password);
      if (ok) {
        showMsg(msgEl, "Registered locally", "success");
        setTimeout(() => (window.location.href = "index.html"), 900);
        return;
      }
      showMsg(msgEl, "Network error or backend unavailable");
    }
  });
}

// ================= LOCAL MOCK AUTH (fallback) =================
function localRegister(name, email, password){
  const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
  if (users.find(u => u.email === email)) return false;
  users.push({ name, email, password });
  localStorage.setItem("mock_users", JSON.stringify(users));
  localStorage.setItem("token", btoa(email + ":" + Date.now()));
  return true;
}

function localLogin(email, password){
  const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
  const u = users.find(u => u.email === email && u.password === password);
  if (!u) return false;
  localStorage.setItem("token", btoa(email + ":" + Date.now()));
  return true;
}
