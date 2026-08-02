export async function getHealth() {
  const response = await fetch("/api/health");
  if (!response.ok) throw new Error("Health check failed");
  return response.json();
}

export async function streamChat(payload, { onToken, onDone, onError, signal } = {}) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    let message = "تعذر الاتصال بخدمة الذكاء الاصطناعي. حاول مرة أخرى.";
    try {
      const json = await response.json();
      if (json.error) message = json.error;
    } catch {}
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const line = event.split("\n").find((x) => x.startsWith("data:"));
      if (!line) continue;
      try {
        const data = JSON.parse(line.slice(5).trim());
        if (data.token) onToken?.(data.token);
        if (data.done) onDone?.();
        if (data.error) onError?.(new Error(data.error));
      } catch {}
    }
  }
}