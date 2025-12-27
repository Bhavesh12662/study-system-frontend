// ================= BASE URL OF BACKEND =================
const API = "https://api.promptify.tech";
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

  const res = await fetch(`${API}/study`);
  const data = await res.json();

  summary.innerHTML = "";

  data.forEach((s, index) => {
    const div = document.createElement("div");
    const mins = Math.floor(s.duration / (1000 * 60));
    div.textContent = `${index + 1}. ${s.subject} — ${mins} min`;
    summary.appendChild(div);
  });
}


// ================= ATTENDANCE =================
presentBtn.addEventListener("click", async () => {
  attendanceStatus.textContent = "Present";

  await fetch(`${API}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "Present",
      date: new Date()
    }),
  });

  messageBox.textContent = "Attendance marked: Present";
  loadWeeklyReport();
});

absentBtn.addEventListener("click", async () => {
  attendanceStatus.textContent = "Absent";

  await fetch(`${API}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "Absent",
      date: new Date()
    }),
  });

  messageBox.textContent = "Attendance marked: Absent";
  loadWeeklyReport();
});


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

  startTime = null;
  timerDisplay.textContent = "00:00:00";

  loadSummary();
  loadWeeklyReport();
});


// ================= WEEKLY REPORT =================
async function loadWeeklyReport() {
  const last7 = Date.now() - 7 * 24 * 60 * 60 * 1000;

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
      days.add(d.toISOString().slice(0, 10)); // yyyy-mm-dd
    }
  });

  const presentDays = days.size;

  document.getElementById("weekAttendance").textContent =
    `Attendance: ${presentDays} / 7 days`;

  const percent = Math.min(100, Math.round((presentDays / 7) * 100));

  document.getElementById("weekPercentage").textContent =
    `Attendance %: ${percent}%`;
}


// ================= INIT =================
loadSummary();
loadWeeklyReport();
