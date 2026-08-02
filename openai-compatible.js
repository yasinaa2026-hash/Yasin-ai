export class OpenAICompatibleProvider {
  constructor({ apiKey, apiUrl, model }) {
    this.name = "OpenAI-compatible";
    this.apiKey = apiKey || "";
    this.apiUrl = apiUrl || "";
    this.model = model || "";
    this.demoMode = !this.apiKey || !this.apiUrl || !this.model;
  }

  async stream({ messages, model, temperature, maxTokens, onToken }) {
    if (this.demoMode) {
      await this.demoStream(messages, onToken);
      return;
    }

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: model || this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true
      })
    });

    if (!response.ok || !response.body) {
      throw new Error(`Provider returned ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;

        try {
          const json = JSON.parse(payload);
          const token = json.choices?.[0]?.delta?.content;
          if (token) onToken(token);
        } catch {
          // Ignore incomplete/non-JSON provider events.
        }
      }
    }
  }

  async demoStream(messages, onToken) {
    const last = messages.at(-1)?.content;
    const prompt = typeof last === "string" ? last : "رسالتك";
    const answer =
      `**Demo Mode**\n\n` +
      `Yasin AI يعمل الآن بدون API حقيقي. وصلتني رسالتك:\n\n` +
      `> ${prompt.slice(0, 500)}\n\n` +
      `للحصول على إجابة من نموذج ذكاء اصطناعي حقيقي، أضف مفاتيح البيئة في `.env` ثم أعد تشغيل الخادم.\n\n` +
      `يمكنك تجربة المحادثات والحفظ والبحث والواجهة والـ Streaming في وضع التجربة.`;

    for (const token of answer.split(/(\s+)/)) {
      await new Promise((r) => setTimeout(r, 18));
      onToken(token);
    }
  }
}