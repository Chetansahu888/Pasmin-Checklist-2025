const TELEGRAM_BOT_TOKEN = "8662405933:AAGQU1dj8fpQWOwY1YDgs2NvCXSTc92vEvc";
const TELEGRAM_GROUP_ID = "-1003616378623";

const FREQ_LABELS = {
  daily: "📆 Daily (Rozana)",
  weekly: "📅 Weekly",
  monthly: "🗓️ Monthly",
  quarterly: "📊 Quarterly",
  yearly: "🎯 Yearly",
  "end-of-week": "🏁 End of Week",
};

export async function sendTaskAssignedNotification({ doer, description, department, givenBy, frequency, startDate, totalTasks, requireAttachment, enableReminders }) {
  const freqLabel = FREQ_LABELS[frequency] || frequency;
  const attachmentLine = requireAttachment ? "📎 Attachment Required: <b>Haan ✅</b>" : "📎 Attachment Required: <b>Nahi ❌</b>";
  const reminderLine = enableReminders ? "🔔 Reminders: <b>On ✅</b>" : "🔔 Reminders: <b>Off</b>";

  const message = `
🎯 <b>✨ New Task Assigned! ✨</b> 🎯

━━━━━━━━━━━━━━━━━━━━━━

👤 <b>Assigned To:</b> ${doer}
📋 <b>Task:</b> ${description}
🏢 <b>Department:</b> ${department}
👔 <b>Assigned By:</b> ${givenBy}
📅 <b>Start Date:</b> ${startDate}
🔄 <b>Frequency:</b> ${freqLabel}
${attachmentLine}
${reminderLine}

━━━━━━━━━━━━━━━━━━━━━━

📊 <b>Total Tasks Created:</b> ${totalTasks}
⚡ <i>Please ensure the task is completed on time!</i>

🏆 <b>CheckList & Delegation System</b>
  `.trim();

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_GROUP_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("Telegram notification failed:", err);
  }
}

async function sendToTelegram(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_GROUP_ID,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("Telegram notification failed:", err);
  }
}

export async function sendOverdueAlert(overdueTasks) {
  if (!overdueTasks || overdueTasks.length === 0) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = today.toISOString().split("T")[0];

  const alreadySent = localStorage.getItem("telegram_overdue_alert_date");
  if (alreadySent === todayKey) return;

  // Group by person
  const byPerson = {};
  overdueTasks.forEach((task) => {
    const person = task["col4"] || "Unknown";
    if (!byPerson[person]) byPerson[person] = [];
    byPerson[person].push(task);
  });

  const lines = Object.entries(byPerson)
    .map(([person, tasks]) => {
      const taskLines = tasks
        .map((t) => `   📋 ${t["col5"] || "—"}\n   📅 Due: <b>${t["col10"] || "—"}</b>`)
        .join("\n");
      return `🔴 <b>${person}</b>\n${taskLines}`;
    })
    .join("\n\n");

  const message = `⚠️ 🔴 <b>PENDING ALERT!</b> 🔴 ⚠️

━━━━━━━━━━━━━━━━━━━━━━

Niche diye gaye members ke tasks abhi bhi <b>OVERDUE</b> hain:

${lines}

━━━━━━━━━━━━━━━━━━━━━━

📊 <b>Total Overdue Tasks:</b> ${overdueTasks.length}
❗ <i>Kripya turant poora karein!</i>

🏆 <b>CheckList &amp; Delegation System</b>`.trim();

  localStorage.setItem("telegram_overdue_alert_date", todayKey);
  await sendToTelegram(message);
}
