const KEY = "yasin-ai-state-v1";

const defaultState = {
  conversations: [],
  settings: {
    theme: "system",
    language: "ar",
    model: "",
    temperature: 0.7,
    responseLength: 2048
  }
};

export function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    return { ...defaultState, ...parsed, settings: { ...defaultState.settings, ...(parsed?.settings || {}) } };
  } catch {
    return structuredClone(defaultState);
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function createConversation() {
  return {
    id: crypto.randomUUID(),
    title: "محادثة جديدة",
    updatedAt: Date.now(),
    messages: []
  };
}