"use strict";

const STORAGE_KEY = "kindred-chat-state-v1";
const MAX_MESSAGE_LENGTH = 2000;
const contacts = [
  { id: "maya", name: "Maya Chen", tone: "lilac", unread: 2, messages: [
    { text: "Hey! Did you get a chance to look at those photos from the weekend?", sent: false, minutesAgo: 26 },
    { text: "I did — the one by the lake is so good 🌿", sent: true, minutesAgo: 22 },
    { text: "Right? We should go back when the leaves change.", sent: false, minutesAgo: 18 }
  ] },
  { id: "oliver", name: "Oliver James", tone: "peach", unread: 0, messages: [
    { text: "Coffee and a catch-up this week?", sent: false, minutesAgo: 142 },
    { text: "Absolutely. Thursday afternoon works for me ☕", sent: true, minutesAgo: 119 }
  ] },
  { id: "amira", name: "Amira Hassan", tone: "mint", unread: 1, messages: [
    { text: "I found that little bookstore you mentioned!", sent: false, minutesAgo: 310 },
    { text: "The one on Willow Street? I love that place.", sent: true, minutesAgo: 296 },
    { text: "Yes! They have the loveliest reading nook.", sent: false, minutesAgo: 282 }
  ] },
  { id: "leo", name: "Leo Martinez", tone: "sky", unread: 0, messages: [
    { text: "Sending over the playlist from the road trip 🎶", sent: false, minutesAgo: 1440 },
    { text: "This is going straight into my favorites. Thanks!", sent: true, minutesAgo: 1388 }
  ] },
  { id: "nora", name: "Nora Williams", tone: "rose", unread: 0, messages: [
    { text: "How did your first pottery class go?", sent: false, minutesAgo: 3160 },
    { text: "A little messy, a lot of fun. I made a very lopsided bowl 😄", sent: true, minutesAgo: 3100 }
  ] },
  { id: "theo", name: "Theo Brooks", tone: "butter", unread: 0, messages: [
    { text: "Made it home safe — thanks for a lovely evening!", sent: false, minutesAgo: 4320 },
    { text: "So glad! Let's do it again soon.", sent: true, minutesAgo: 4275 }
  ] }
];

const appShell = document.querySelector(".app-shell");
const contactList = document.querySelector("#contact-list");
const contactSearch = document.querySelector("#contact-search");
const listCount = document.querySelector("#list-count");
const inboxCount = document.querySelector("#inbox-count");
const emptyState = document.querySelector("#empty-state");
const activeConversation = document.querySelector("#active-conversation");
const chatPerson = document.querySelector("#chat-person");
const messageList = document.querySelector("#message-list");
const messageForm = document.querySelector("#message-form");
const messageInput = document.querySelector("#message-input");
const sendButton = document.querySelector("#send-button");
const characterCount = document.querySelector("#character-count");
const clearButton = document.querySelector("#clear-button");
const backButton = document.querySelector("#back-button");
const toast = document.querySelector("#toast");

let state = restoreState();
let toastTimer;

function createSeedState() {
  const now = Date.now();
  const conversations = {};
  contacts.forEach((contact) => {
    conversations[contact.id] = {
      unread: contact.unread,
      messages: contact.messages.map((message) => ({
        text: message.text,
        sent: message.sent,
        timestamp: new Date(now - message.minutesAgo * 60_000).toISOString()
      }))
    };
  });
  return { conversations, activeId: null };
}

function restoreState() {
  const initial = createSeedState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object" || !saved.conversations || typeof saved.conversations !== "object") {
      return initial;
    }

    contacts.forEach((contact) => {
      const savedConversation = saved.conversations[contact.id];
      if (!savedConversation || typeof savedConversation !== "object" || !Array.isArray(savedConversation.messages)) return;
      const messages = savedConversation.messages
        .filter(isValidMessage)
        .map((message) => ({
          text: message.text,
          sent: message.sent,
          timestamp: new Date(message.timestamp).toISOString()
        }));
      initial.conversations[contact.id] = {
        unread: Number.isInteger(savedConversation.unread) && savedConversation.unread > 0
          ? Math.min(savedConversation.unread, 99)
          : 0,
        messages
      };
    });

    initial.activeId = contacts.some((contact) => contact.id === saved.activeId) ? saved.activeId : null;
    if (initial.activeId) initial.conversations[initial.activeId].unread = 0;
    return initial;
  } catch (error) {
    console.warn("Saved chat data could not be restored; starting with the demo conversations.", error);
    return initial;
  }
}

function isValidMessage(message) {
  return message &&
    typeof message.text === "string" &&
    message.text.length <= MAX_MESSAGE_LENGTH &&
    typeof message.sent === "boolean" &&
    typeof message.timestamp === "string" &&
    Number.isFinite(Date.parse(message.timestamp));
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Chat changes could not be saved in this browser.", error);
    showToast("Changes couldn't be saved in this browser.");
  }
}

function getContact(contactId) {
  return contacts.find((contact) => contact.id === contactId);
}

function getConversation(contactId) {
  return state.conversations[contactId];
}

function getInitials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function createAvatar(contact, extraClass = "") {
  const avatar = document.createElement("span");
  avatar.className = `avatar ${extraClass}`.trim();
  avatar.dataset.tone = contact.tone;
  avatar.textContent = getInitials(contact.name);
  avatar.setAttribute("aria-hidden", "true");
  return avatar;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function getLastMessage(contactId) {
  const messages = getConversation(contactId).messages;
  return messages[messages.length - 1] || null;
}

function renderContacts() {
  const query = contactSearch.value.trim().toLocaleLowerCase();
  const visibleContacts = contacts.filter((contact) => contact.name.toLocaleLowerCase().includes(query));
  contactList.replaceChildren();
  listCount.textContent = String(visibleContacts.length);
  const unreadTotal = contacts.reduce((total, contact) => total + getConversation(contact.id).unread, 0);
  inboxCount.textContent = unreadTotal ? String(unreadTotal) : "";

  if (visibleContacts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "list-empty";
    empty.textContent = "No people found. Try another name.";
    contactList.append(empty);
    return;
  }

  visibleContacts.forEach((contact) => {
    const conversation = getConversation(contact.id);
    const lastMessage = getLastMessage(contact.id);
    const item = document.createElement("button");
    item.type = "button";
    item.className = `contact-item${state.activeId === contact.id ? " is-active" : ""}`;
    item.setAttribute("aria-label", `${contact.name}${conversation.unread ? `, ${conversation.unread} unread` : ""}`);
    item.setAttribute("aria-current", state.activeId === contact.id ? "true" : "false");
    item.addEventListener("click", () => selectContact(contact.id));
    item.append(createAvatar(contact));

    const copy = document.createElement("span");
    copy.className = "contact-copy";
    const topLine = document.createElement("span");
    topLine.className = "contact-topline";
    const name = document.createElement("span");
    name.className = "contact-name";
    name.textContent = contact.name;
    const time = document.createElement("span");
    time.className = "contact-time";
    time.textContent = lastMessage ? formatTime(lastMessage.timestamp) : "";
    topLine.append(name, time);

    const bottomLine = document.createElement("span");
    bottomLine.className = "contact-bottomline";
    const preview = document.createElement("span");
    preview.className = "contact-preview";
    preview.textContent = lastMessage ? `${lastMessage.sent ? "You: " : ""}${lastMessage.text}` : "No messages yet";
    bottomLine.append(preview);
    if (conversation.unread) {
      const badge = document.createElement("span");
      badge.className = "unread-badge";
      badge.textContent = String(conversation.unread);
      badge.setAttribute("aria-hidden", "true");
      bottomLine.append(badge);
    }

    copy.append(topLine, bottomLine);
    item.append(copy);
    contactList.append(item);
  });
}

function selectContact(contactId) {
  state.activeId = contactId;
  getConversation(contactId).unread = 0;
  messageInput.value = "";
  updateComposer();
  saveState();
  render();
}

function renderConversation() {
  const contact = getContact(state.activeId);
  if (!contact) {
    emptyState.hidden = false;
    activeConversation.hidden = true;
    appShell.classList.remove("has-active");
    return;
  }

  emptyState.hidden = true;
  activeConversation.hidden = false;
  appShell.classList.add("has-active");
  chatPerson.replaceChildren();
  chatPerson.append(createAvatar(contact));
  const personCopy = document.createElement("div");
  personCopy.className = "chat-person-copy";
  const name = document.createElement("p");
  name.className = "chat-person-name";
  name.textContent = contact.name;
  const status = document.createElement("p");
  status.className = "chat-person-status";
  const statusDot = document.createElement("span");
  statusDot.className = "status-dot";
  statusDot.setAttribute("aria-hidden", "true");
  status.append(statusDot, document.createTextNode("Conversation"));
  personCopy.append(name, status);
  chatPerson.append(personCopy);
  renderMessages(contact);
}

function renderMessages(contact) {
  messageList.replaceChildren();
  const messages = getConversation(contact.id).messages;
  if (messages.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-messages";
    const icon = document.createElement("span");
    icon.className = "empty-messages-icon";
    icon.setAttribute("aria-hidden", "true");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    ["M4 5.5h16v12H9l-5 3v-3H4v-12Z", "M8 10h8M8 13h5"].forEach((pathData) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      svg.append(path);
    });
    icon.append(svg);
    const title = document.createElement("strong");
    title.textContent = "A fresh start";
    const hint = document.createElement("span");
    hint.textContent = `Send ${contact.name.split(" ")[0]} a message to get things going.`;
    empty.append(icon, title, hint);
    messageList.append(empty);
    return;
  }

  messages.forEach((message) => {
    const row = document.createElement("div");
    row.className = `message-row${message.sent ? " is-sent" : ""}`;
    if (!message.sent) row.append(createAvatar(contact, "message-avatar"));

    const content = document.createElement("div");
    content.className = "message-content";
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = message.text;
    const meta = document.createElement("div");
    meta.className = "message-meta";
    if (!message.sent) {
      const sender = document.createElement("span");
      sender.className = "message-name";
      sender.textContent = contact.name.split(" ")[0];
      meta.append(sender);
    }
    const timestamp = document.createElement("time");
    timestamp.dateTime = message.timestamp;
    timestamp.textContent = formatTime(message.timestamp);
    meta.append(timestamp);
    content.append(bubble, meta);
    row.append(content);
    messageList.append(row);
  });
  messageList.scrollTop = messageList.scrollHeight;
}

function render() {
  renderContacts();
  renderConversation();
}

function updateComposer() {
  const length = messageInput.value.length;
  const hasText = messageInput.value.trim().length > 0;
  sendButton.disabled = !hasText || !state.activeId;
  characterCount.textContent = length > 1750 ? `${length}/${MAX_MESSAGE_LENGTH}` : "";
  messageInput.style.height = "auto";
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 110)}px`;
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || text.length > MAX_MESSAGE_LENGTH || !state.activeId) return;
  getConversation(state.activeId).messages.push({
    text,
    sent: true,
    timestamp: new Date().toISOString()
  });
  messageInput.value = "";
  updateComposer();
  saveState();
  render();
  messageInput.focus();
}

function clearConversation() {
  if (!state.activeId) return;
  const contact = getContact(state.activeId);
  if (!window.confirm(`Clear all messages with ${contact.name}? This can't be undone.`)) return;
  getConversation(state.activeId).messages = [];
  getConversation(state.activeId).unread = 0;
  saveState();
  render();
  showToast("Conversation cleared.");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

contactSearch.addEventListener("input", renderContacts);
messageInput.addEventListener("input", updateComposer);
messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    sendMessage();
  }
});
messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});
clearButton.addEventListener("click", clearConversation);
backButton.addEventListener("click", () => {
  state.activeId = null;
  saveState();
  render();
});
document.querySelector(".compose-button").addEventListener("click", () => {
  contactSearch.focus();
  showToast("Choose a conversation from your list.");
});
document.querySelector(".brand").addEventListener("click", (event) => event.preventDefault());
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    contactSearch.focus();
  }
  if (event.key === "/" && document.activeElement !== contactSearch && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    contactSearch.focus();
  }
});

render();
updateComposer();
