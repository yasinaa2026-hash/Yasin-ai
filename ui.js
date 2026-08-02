import { renderMarkdown } from "./markdown.js";

export function renderConversations(list, conversations, activeId, onOpen, onDelete) {
  list.innerHTML = "";
  if (!conversations.length) {
    list.innerHTML = '<div class="empty">لا توجد محادثات بعد.</div>';
    return;
  }

  for (const chat of conversations) {
    const row = document.createElement("div");
    row.className = `conversation-item ${chat.id === activeId ? "active" : ""}`;

    const button = document.createElement("button");
    button.className = "conversation-item";
    button.style.flex = "1";
    button.innerHTML = `<span>💬</span><span class="name"></span>`;
    button.querySelector(".name").textContent = chat.title;
    button.addEventListener("click", () => onOpen(chat.id));

    const del = document.createElement("button");
    del.className = "delete-chat";
    del.textContent = "×";
    del.title = "حذف";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      onDelete(chat.id);
    });

    row.append(button, del);
    list.appendChild(row);
  }
}

export function renderMessages(container, messages) {
  container.innerHTML = "";
  for (const message of messages) {
    appendMessage(container, message);
  }
  container.scrollTop = container.scrollHeight;
}

export function appendMessage(container, message) {
  const el = document.createElement("article");
  el.className = `message ${message.role}`;
  el.dataset.messageId = message.id || "";
  el.innerHTML = `
    <div class="avatar">${message.role === "user" ? "أنت" : "Y"}</div>
    <div class="bubble">
      <div class="message-content">${message.role === "assistant" ? renderMarkdown(message.content || "") : escapeText(message.content || "")}</div>
      ${message.role === "assistant" ? `
        <div class="message-actions">
          <button data-action="copy">نسخ</button>
          <button data-action="regenerate">إعادة</button>
          <button data-action="edit">تعديل</button>
          <button data-action="share">مشاركة</button>
        </div>` : ""}
    </div>`;
  container.appendChild(el);
  return el;
}

export function updateMessage(el, content) {
  const target = el.querySelector(".message-content");
  target.innerHTML = renderMarkdown(content);
}

export function showTyping(container) {
  const el = document.createElement("article");
  el.className = "message assistant";
  el.id = "typing";
  el.innerHTML = `<div class="avatar">Y</div><div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div>`;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function escapeText(value) {
  return value.replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}