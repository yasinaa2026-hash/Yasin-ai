import { loadState, saveState, createConversation } from "./storage.js";
import { streamChat, getHealth } from "./api.js";
import { renderConversations, renderMessages, appendMessage, updateMessage, showTyping } from "./ui.js";

const state = loadState();
let activeId = null;
let controller = null;
let selectedFiles = [];

const $ = (s) => document.querySelector(s);
const els = {
  sidebar: $("#sidebar"),
  menuBtn: $("#menuBtn"),
  newChat: $("#newChatBtn"),
  search: $("#searchInput"),
  list: $("#conversationList"),
  home: $("#homeView"),
  chat: $("#chatView"),
  panel: $("#panelView"),
  messages: $("#messages"),
  prompt: $("#promptInput"),
  chatInput: $("#chatInput"),
  send: $("#sendBtn"),
  chatSend: $("#chatSendBtn"),
  stop: $("#stopBtn"),
  attach: $("#attachBtn"),
  chatAttach: $("#chatAttachBtn"),
  file: $("#fileInput"),
  preview: $("#filePreview"),
  model: $("#modelSelect"),
  theme: $("#themeBtn"),
  settings: $("#settingsBtn"),
  title: $("#pageTitle")
};

function currentChat() {
  return state.conversations.find((c) => c.id === activeId);
}

function persist() {
  saveState(state);
  refreshList();
}

function refreshList(filter = "") {
  const q = filter.trim().toLowerCase();
  const chats = state.conversations
    .filter((c) => !q || c.title.toLowerCase().includes(q) || c.messages.some((m) => String(m.content).toLowerCase().includes(q)))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  renderConversations(els.list, chats, activeId, openChat, deleteChat);
}

function createNewChat() {
  const chat = createConversation();
  state.conversations.unshift(chat);
  activeId = chat.id;
  persist();
  showChat();
  renderMessages(els.messages, []);
  els.title.textContent = chat.title;
  els.chatInput.focus();
}

function openChat(id) {
  activeId = id;
  const chat = currentChat();
  if (!chat) return;
  showChat();
  els.title.textContent = chat.title;
  renderMessages(els.messages, chat.messages);
  refreshList();
  els.sidebar.classList.remove("open");
}

function deleteChat(id) {
  const index = state.conversations.findIndex((c) => c.id === id);
  if (index < 0) return;
  state.conversations.splice(index, 1);
  if (activeId === id) {
    activeId = state.conversations[0]?.id || null;
    if (activeId) openChat(activeId);
    else showHome();
  }
  persist();
}

function showHome() {
  els.home.hidden = false;
  els.chat.hidden = true;
  els.panel.hidden = true;
  els.title.textContent = "Yasin AI";
}

function showChat() {
  els.home.hidden = true;
  els.chat.hidden = false;
  els.panel.hidden = true;
}

function showPanel(html, title) {
  els.home.hidden = true;
  els.chat.hidden = true;
  els.panel.hidden = false;
  els.panel.innerHTML = html;
  els.title.textContent = title;
}

async function sendMessage(text, sourceInput = els.chatInput) {
  const prompt = text.trim();
  if (!prompt || controller) return;

  if (!activeId) createNewChat();
  const chat = currentChat();
  if (!chat) return;

  if (!chat.messages.length) {
    chat.title = prompt.slice(0, 45);
  }

  const userMessage = { id: crypto.randomUUID(), role: "user", content: prompt, createdAt: Date.now() };
  chat.messages.push(userMessage);
  chat.updatedAt = Date.now();
  renderMessages(els.messages, chat.messages);
  sourceInput.value = "";
  persist();

  controller = new AbortController();
  els.stop.hidden = false;
  showTyping(els.messages);

  const assistantMessage = { id: crypto.randomUUID(), role: "assistant", content: "", createdAt: Date.now() };
  chat.messages.push(assistantMessage);

  try {
    await streamChat({
      messages: chat.messages.filter((m) => m.id !== assistantMessage.id).map(({ role, content }) => ({ role, content })),
      model: els.model.value || state.settings.model,
      temperature: state.settings.temperature,
      maxTokens: state.settings.responseLength
    }, {
      signal: controller.signal,
      onToken(token) {
        const typing = $("#typing");
        typing?.remove();
        assistantMessage.content += token;
        let el = els.messages.querySelector(`[data-message-id="${assistantMessage.id}"]`);
        if (!el) el = appendMessage(els.messages, assistantMessage);
        updateMessage(el, assistantMessage.content);
        els.messages.scrollTop = els.messages.scrollHeight;
      },
      onDone() {},
      onError(error) { throw error; }
    });
  } catch (error) {
    if (error.name !== "AbortError") {
      assistantMessage.content = "تعذر الاتصال بخدمة الذكاء الاصطناعي. حاول مرة أخرى.";
      const existing = els.messages.querySelector(`[data-message-id="${assistantMessage.id}"]`);
      if (existing) updateMessage(existing, assistantMessage.content);
      else appendMessage(els.messages, assistantMessage);
    }
  } finally {
    $("#typing")?.remove();
    controller = null;
    els.stop.hidden = true;
    chat.updatedAt = Date.now();
    persist();
  }
}

function selectFiles(files) {
  selectedFiles = [...files].slice(0, 5);
  els.preview.hidden = selectedFiles.length === 0;
  els.preview.innerHTML = selectedFiles.map((f) => `<span class="file-chip">${escapeHtml(f.name)} · ${formatBytes(f.size)}</span>`).join("");
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function applyTheme() {
  const wanted = state.settings.theme;
  const dark = wanted === "dark" || (wanted === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.body.classList.toggle("dark", dark);
}

function settingsPanel() {
  showPanel(`
    <h2>الإعدادات</h2>
    <div class="setting-row"><div><strong>المظهر</strong><div class="muted">فاتح، داكن أو حسب النظام</div></div>
      <select id="themeSetting"><option value="system">النظام</option><option value="light">فاتح</option><option value="dark">داكن</option></select></div>
    <div class="setting-row"><div><strong>اللغة</strong><div class="muted">لغة واجهة التطبيق</div></div>
      <select id="languageSetting"><option value="ar">العربية</option><option value="en">English</option><option value="ms">Malay</option></select></div>
    <div class="setting-row"><div><strong>Temperature</strong><div class="muted">درجة تنوع الإجابات</div></div>
      <input id="temperatureSetting" type="range" min="0" max="1" step=".1"></div>
    <div class="setting-row"><div><strong>طول الاستجابة</strong><div class="muted">الحد الأقصى المقترح للرموز</div></div>
      <select id="lengthSetting"><option value="1024">قصير</option><option value="2048">متوسط</option><option value="4096">طويل</option></select></div>
    <div class="setting-row"><div><strong>وضع البيانات</strong><div class="muted">المحادثات تحفظ محليًا في هذا النموذج التجريبي.</div></div><span>Local</span></div>
    <div class="setting-row"><div><strong>API</strong><div class="muted" id="healthStatus">جارٍ الفحص...</div></div></div>
  `, "الإعدادات");

  $("#themeSetting").value = state.settings.theme;
  $("#languageSetting").value = state.settings.language;
  $("#temperatureSetting").value = state.settings.temperature;
  $("#lengthSetting").value = state.settings.responseLength;

  $("#themeSetting").onchange = (e) => { state.settings.theme = e.target.value; persist(); applyTheme(); };
  $("#languageSetting").onchange = (e) => { state.settings.language = e.target.value; persist(); };
  $("#temperatureSetting").oninput = (e) => { state.settings.temperature = Number(e.target.value); persist(); };
  $("#lengthSetting").onchange = (e) => { state.settings.responseLength = Number(e.target.value); persist(); };

  getHealth().then((h) => {
    $("#healthStatus").textContent = h.demoMode ? "Demo Mode — لا يوجد API حقيقي" : `متصل · ${h.provider}`;
  }).catch(() => {
    $("#healthStatus").textContent = "الخادم غير متاح";
  });
}

function helpPanel() {
  showPanel(`
    <h2>المساعدة</h2>
    <p>Yasin AI عبارة عن واجهة مستقلة قابلة للربط مع مزود AI عبر Backend.</p>
    <h3>اختصارات لوحة المفاتيح</h3>
    <ul><li>Enter: إرسال</li><li>Shift + Enter: سطر جديد</li><li>Ctrl/Cmd + K: البحث</li><li>Ctrl/Cmd + N: محادثة جديدة</li><li>Esc: إغلاق القائمة</li></ul>
    <h3>الوضع التجريبي</h3>
    <p class="muted">إذا لم تضف AI_API_KEY وAI_MODEL وAI_API_URL، يستخدم الخادم Mock Response ولا يدعي أنه نموذج حقيقي.</p>
  `, "المساعدة");
}

function bindMessageActions() {
  els.messages.addEventListener("click", async (e) => {
    const codeBtn = e.target.closest("[data-copy-code]");
    if (codeBtn) {
      await navigator.clipboard.writeText(decodeURIComponent(codeBtn.dataset.copyCode));
      codeBtn.textContent = "تم";
      setTimeout(() => codeBtn.textContent = "Copy", 900);
      return;
    }

    const action = e.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    const article = e.target.closest(".message");
    const id = article?.dataset.messageId;
    const chat = currentChat();
    const msg = chat?.messages.find((m) => m.id === id);
    if (!msg) return;

    if (action === "copy") await navigator.clipboard.writeText(msg.content);
    if (action === "edit" && msg.role === "user") {
      els.chatInput.value = msg.content;
      els.chatInput.focus();
    }
    if (action === "regenerate") {
      const index = chat.messages.findIndex((m) => m.id === id);
      if (index > 0 && chat.messages[index - 1].role === "user") {
        chat.messages.splice(index, 1);
        renderMessages(els.messages, chat.messages);
        await sendMessage(chat.messages[index - 1].content, els.chatInput);
      }
    }
    if (action === "share") {
      const text = msg.content;
      if (navigator.share) await navigator.share({ title: chat.title, text });
      else await navigator.clipboard.writeText(text);
    }
  });
}

els.newChat.onclick = createNewChat;
els.menuBtn.onclick = () => els.sidebar.classList.toggle("open");
els.search.oninput = (e) => refreshList(e.target.value);
els.send.onclick = () => { const value = els.prompt.value; els.prompt.value = ""; if (value.trim()) { createNewChat(); sendMessage(value, els.chatInput); } };
els.chatSend.onclick = () => sendMessage(els.chatInput.value);
els.stop.onclick = () => controller?.abort();
els.attach.onclick = () => els.file.click();
els.chatAttach.onclick = () => els.file.click();
els.file.onchange = (e) => selectFiles(e.target.files);
els.theme.onclick = () => { state.settings.theme = document.body.classList.contains("dark") ? "light" : "dark"; persist(); applyTheme(); };
els.settings.onclick = settingsPanel;

document.querySelectorAll(".suggestions button").forEach((button) => {
  button.onclick = () => {
    els.prompt.value = button.dataset.prompt;
    els.prompt.focus();
  };
});

document.querySelectorAll(".nav-btn").forEach((button) => {
  button.onclick = () => button.dataset.page === "settings" ? settingsPanel() : helpPanel();
});

for (const input of [els.prompt, els.chatInput]) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input === els.prompt) els.send.click();
      else els.chatSend.click();
    }
  });
}

document.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); els.search.focus(); }
  if (mod && e.key.toLowerCase() === "n") { e.preventDefault(); createNewChat(); }
  if (e.key === "Escape") els.sidebar.classList.remove("open");
});

bindMessageActions();
applyTheme();
refreshList();
showHome();