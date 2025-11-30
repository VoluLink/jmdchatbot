"""
Gradio Web Interface for RAG System.

Provides a modern, ChatGPT-style chat interface for querying the RAG index.
"""

from __future__ import annotations

from typing import List

import gradio as gr

from src.config.settings import get_settings
from src.indexing import get_index_manager


settings = get_settings()
index_manager = get_index_manager()

# ChatGPT/Apple inspired CSS
CUSTOM_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

/* Root variables */
:root {
    --bg-primary: #212121;
    --bg-secondary: #2f2f2f;
    --bg-tertiary: #424242;
    --bg-input: #2f2f2f;
    --text-primary: #ececec;
    --text-secondary: #b4b4b4;
    --text-muted: #8e8e8e;
    --accent: #10a37f;
    --accent-hover: #1a7f64;
    --border: #424242;
    --user-bubble: #2f2f2f;
    --bot-bubble: transparent;
    --radius: 16px;
    --radius-sm: 12px;
    --radius-xs: 8px;
}

* {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
}

/* Main container */
body, .gradio-container, .main, .wrap, .contain {
    background: var(--bg-primary) !important;
    color: var(--text-primary) !important;
}

.gradio-container {
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 24px !important;
    min-height: 100vh !important;
}

/* Header */
.app-header {
    padding: 20px 32px;
    text-align: left;
    border-bottom: 1px solid var(--border);
    background: var(--bg-primary);
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.app-header h1 {
    font-size: 22px !important;
    font-weight: 600 !important;
    color: var(--text-primary) !important;
    margin: 0 !important;
    letter-spacing: -0.3px;
}

.app-header p {
    font-size: 13px !important;
    color: var(--text-muted) !important;
    margin: 4px 0 0 0 !important;
}

/* Chatbot container */
#chatbot {
    background: transparent !important;
    border: none !important;
    padding: 24px 32px !important;
}

.chatbot, [data-testid="chatbot"] {
    background: transparent !important;
    border: none !important;
}

/* Message bubbles - ChatGPT style */
.message, .user, .bot, [data-testid="user"], [data-testid="bot"] {
    padding: 16px 0 !important;
    background: transparent !important;
    border: none !important;
    border-radius: 0 !important;
}

.message.user .message-content, 
[data-testid="user"] .message-content,
.user-message {
    background: var(--user-bubble) !important;
    border-radius: var(--radius) !important;
    padding: 14px 18px !important;
    margin-left: auto !important;
    max-width: 70% !important;
    color: var(--text-primary) !important;
    font-size: 15px !important;
    line-height: 1.6 !important;
}

.message.bot .message-content,
[data-testid="bot"] .message-content,
.bot-message {
    background: var(--bot-bubble) !important;
    padding: 14px 0 !important;
    max-width: 85% !important;
    color: var(--text-primary) !important;
    font-size: 15px !important;
    line-height: 1.7 !important;
}

/* Avatar hiding for cleaner look */
.avatar-container, .avatar {
    display: none !important;
}

/* Input area - ChatGPT style */
.input-container {
    position: sticky;
    bottom: 0;
    background: var(--bg-primary);
    padding: 20px 32px;
    border-top: 1px solid var(--border);
}

.input-wrapper {
    background: var(--bg-input) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius) !important;
    padding: 4px !important;
    display: flex !important;
    align-items: flex-end !important;
    transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
}

.input-wrapper:focus-within {
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 2px rgba(16, 163, 127, 0.1) !important;
}

/* Textbox */
textarea, input[type="text"], .textbox {
    background: transparent !important;
    border: none !important;
    color: var(--text-primary) !important;
    font-size: 15px !important;
    padding: 12px 16px !important;
    resize: none !important;
    outline: none !important;
    box-shadow: none !important;
    line-height: 1.5 !important;
}

textarea::placeholder, input::placeholder {
    color: var(--text-muted) !important;
}

textarea:focus, input:focus {
    outline: none !important;
    box-shadow: none !important;
    border: none !important;
}

/* Send button - circular like ChatGPT */
.send-btn, button.primary {
    background: var(--accent) !important;
    border: none !important;
    border-radius: var(--radius-xs) !important;
    padding: 10px 20px !important;
    color: white !important;
    font-weight: 500 !important;
    font-size: 14px !important;
    cursor: pointer !important;
    transition: all 0.15s ease !important;
    margin: 4px !important;
    min-width: auto !important;
}

.send-btn:hover, button.primary:hover {
    background: var(--accent-hover) !important;
    transform: scale(1.02) !important;
}

.send-btn:active, button.primary:active {
    transform: scale(0.98) !important;
}

/* Accordion - Settings */
.accordion, details, .gr-accordion {
    background: var(--bg-secondary) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius-sm) !important;
    margin: 16px 32px !important;
    overflow: hidden !important;
}

.accordion summary, .gr-accordion > button, .label-wrap {
    background: var(--bg-secondary) !important;
    color: var(--text-secondary) !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    padding: 14px 16px !important;
    cursor: pointer !important;
    border: none !important;
    transition: background 0.15s ease !important;
}

.accordion summary:hover, .gr-accordion > button:hover, .label-wrap:hover {
    background: var(--bg-tertiary) !important;
}

.accordion .content, .gr-accordion .content {
    background: var(--bg-secondary) !important;
    padding: 0 16px 16px !important;
    border-top: 1px solid var(--border) !important;
}

/* Slider */
input[type="range"] {
    accent-color: var(--accent) !important;
    background: var(--bg-tertiary) !important;
    border-radius: 4px !important;
}

.slider label, .gr-slider label {
    color: var(--text-secondary) !important;
    font-size: 13px !important;
    font-weight: 500 !important;
}

/* Secondary buttons */
button.secondary, .secondary-btn {
    background: var(--bg-tertiary) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius-xs) !important;
    color: var(--text-secondary) !important;
    font-size: 13px !important;
    padding: 8px 16px !important;
    cursor: pointer !important;
    transition: all 0.15s ease !important;
}

button.secondary:hover, .secondary-btn:hover {
    background: var(--border) !important;
    color: var(--text-primary) !important;
}

/* Examples */
.examples button, .gr-samples button {
    background: var(--bg-tertiary) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius-xs) !important;
    color: var(--text-secondary) !important;
    font-size: 13px !important;
    padding: 10px 14px !important;
    cursor: pointer !important;
    transition: all 0.15s ease !important;
    margin: 4px !important;
}

.examples button:hover, .gr-samples button:hover {
    background: var(--accent) !important;
    border-color: var(--accent) !important;
    color: white !important;
}

/* Markdown in messages */
.message code, .bot code {
    background: rgba(0, 0, 0, 0.3) !important;
    padding: 2px 6px !important;
    border-radius: 4px !important;
    font-size: 13px !important;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace !important;
}

.message pre, .bot pre {
    background: rgba(0, 0, 0, 0.4) !important;
    padding: 14px !important;
    border-radius: var(--radius-xs) !important;
    overflow-x: auto !important;
    margin: 12px 0 !important;
}

.message strong, .bot strong {
    color: var(--text-primary) !important;
    font-weight: 600 !important;
}

/* Hide Gradio footer & extra elements */
footer, .footer, .built-with, .show-api {
    display: none !important;
}

/* Loading state */
.generating, .loading {
    opacity: 0.7 !important;
}

/* Scrollbar - minimal */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
}

/* Row styling */
.gr-row, .row {
    gap: 8px !important;
}

/* Block elements */
.gr-block, .block {
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
}

/* Form elements */
.gr-form, .form {
    background: transparent !important;
    border: none !important;
}

/* Wrap label hiding */
.wrap label:empty {
    display: none !important;
}

/* Animation for messages */
@keyframes fadeSlide {
    from {
        opacity: 0;
        transform: translateY(8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.message {
    animation: fadeSlide 0.2s ease-out !important;
}

/* Tips text */
.tips-text {
    color: var(--text-muted) !important;
    font-size: 13px !important;
    line-height: 1.6 !important;
}

.tips-text strong {
    color: var(--text-secondary) !important;
}
"""


def query_rag(
    message: str,
    history: List,
    top_k: int = 5,
) -> str:
    """
    Query the RAG system and return a response.
    """
    if not message.strip():
        return ""

    try:
        index = index_manager.index
        query_engine = index.as_query_engine(similarity_top_k=top_k)
        response = query_engine.query(message)
        answer_text = str(response)

        # Format sources
        sources = []
        for i, node in enumerate(getattr(response, "source_nodes", []) or [], 1):
            metadata = node.metadata or {}
            score = getattr(node, "score", None)

            source_info = f"**Source {i}**"
            if score is not None:
                source_info += f" · {score:.0%}"

            if metadata.get("source") == "local":
                file_path = metadata.get("path", "Unknown")
                file_name = file_path.split("\\")[-1].split("/")[-1]
                source_info += f"\n`{file_name}`"
            elif metadata.get("url"):
                source_info += f"\n{metadata.get('url')}"

            sources.append(source_info)

        full_response = answer_text
        if sources:
            full_response += "\n\n---\n\n📚 **Sources**\n\n" + "\n\n".join(sources)

        return full_response

    except Exception as exc:
        return f"⚠️ Error: {str(exc)}\n\nMake sure the index is initialized."


def create_gradio_interface() -> gr.Blocks:
    """Create the Gradio interface."""
    
    with gr.Blocks(title="RAG Assistant") as demo:
        # Inject CSS
        gr.HTML(f"<style>{CUSTOM_CSS}</style>")
        
        # Header
        gr.HTML(
            """
            <div class="app-header">
                <div>
                    <h1>RAG Assistant</h1>
                    <p>Ask anything about your documents</p>
                </div>
            </div>
            """
        )

        # Chat area
        chatbot = gr.Chatbot(
            elem_id="chatbot",
            height=550,
            show_label=False,
        )

        # Input section
        gr.HTML('<div class="input-container"><div class="input-wrapper">')
        
        with gr.Row():
            msg = gr.Textbox(
                placeholder="Message RAG Assistant...",
                show_label=False,
                container=False,
                scale=9,
                lines=1,
                max_lines=5,
            )
            send = gr.Button("↑", variant="primary", scale=1, min_width=50)
        
        gr.HTML('</div></div>')

        # Settings (collapsed)
        with gr.Accordion("⚙️ Settings", open=False):
            top_k = gr.Slider(
                minimum=1,
                maximum=10,
                value=5,
                step=1,
                label="Sources to retrieve",
            )
            clear = gr.Button("Clear chat", variant="secondary", size="sm")
            gr.Markdown(
                "Adjust how many document sources to search. More sources = comprehensive but slower.",
                elem_classes=["tips-text"],
            )

        # Examples (collapsed)
        with gr.Accordion("💡 Try asking", open=False):
            gr.Examples(
                examples=[
                    ["What are the main topics in the documents?"],
                    ["Summarize the key information"],
                    ["What does it say about residence permits?"],
                ],
                inputs=msg,
            )

        # Handlers
        def chat(message, history, top_k):
            if not message.strip():
                return "", history
            response = query_rag(message, history, top_k)
            history = history + [[message, response]]
            return "", history

        def clear_all():
            return [], ""

        send.click(chat, [msg, chatbot, top_k], [msg, chatbot])
        msg.submit(chat, [msg, chatbot, top_k], [msg, chatbot])
        clear.click(clear_all, outputs=[chatbot, msg])

    return demo


gradio_app = create_gradio_interface()


if __name__ == "__main__":
    gradio_app.launch(
        server_name="127.0.0.1",
        server_port=7860,
    )
