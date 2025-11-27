const modal = document.getElementById("chatModal");
const closeModal = document.getElementById("closeModal");
const chatTitle = document.getElementById("chatTitle");
const chatSubtitle = document.getElementById("chatSubtitle");
const modalAvatar = document.getElementById("modalAvatar");
const messagesEl = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

let currentCharacter = null;

// Characters info
const CHAR = {
  seer: {
    name: "Seer",
    avatar: "img/seer.png",
    subtitle: "Lorekeeper & arcane guidance"
  },
  knight: {
    name: "Knight",
    avatar: "img/knight.png",
    subtitle: "Warrior of steel & tactics"
  },
  dragon: {
    name: "Dragon",
    avatar: "img/dragon.png",
    subtitle: "Ancient flame & secret wisdom"
  }
};

document.querySelectorAll(".select-btn").forEach(btn => {
  btn.onclick = () => openChat(btn.dataset.character);
});

function openChat(id) {
  currentCharacter = id;
  const c = CHAR[id];

  chatTitle.textContent = c.name;
  chatSubtitle.textContent = c.subtitle;
  modalAvatar.src = c.avatar;

  messagesEl.innerHTML = "";
  appendMessage(`${c.name}: Ask me anything about games.`, "bot");

  modal.classList.remove("hidden");
}

closeModal.onclick = () => modal.classList.add("hidden");

function appendMessage(text, who) {
  const m = document.createElement("div");
  m.className = `message ${who}`;
  m.innerText = text;
  messagesEl.appendChild(m);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

chatForm.onsubmit = async (e) => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg) return;

  appendMessage(msg, "user");
  chatInput.value = "";

  const reply = await callApi(msg);
  appendMessage(reply, "bot");
};

// Call backend
async function callApi(message) {
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character: currentCharacter,
        message: message
      })
    });

    const data = await r.json();
    return data.reply || data.error || "No reply";
  } catch (e) {
    return "Server error";
  }
}
