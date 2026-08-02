function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}

export function renderMarkdown(input = "") {
  let text = escapeHtml(String(input));
  const codeBlocks = [];

  text = text.replace(/```([\w#+.-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const id = `code-${codeBlocks.length}`;
    codeBlocks.push({ id, lang: lang || "code", code });
    return `@@${id}@@`;
  });

  text = text
    .replace(/^### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^## (.*)$/gm, "<h3>$1</h3>")
    .replace(/^# (.*)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");

  text = `<p>${text}</p>`;

  for (const block of codeBlocks) {
    const html = `<div class="code-wrap">
      <div class="code-head"><span>${escapeHtml(block.lang)}</span>
      <button class="code-copy" data-copy-code="${encodeURIComponent(block.code)}">Copy</button></div>
      <pre><code>${escapeHtml(block.code)}</code></pre>
    </div>`;
    text = text.replace(`<p>@@${block.id}@@</p>`, html).replace(`@@${block.id}@@`, html);
  }

  return text;
}