"""
Gradio Web Interface for RAG System.

Provides a user-friendly chat interface for querying the RAG index.
"""

from __future__ import annotations

import asyncio
from typing import List, Tuple

import gradio as gr

from src.config.settings import get_settings
from src.indexing import get_index_manager


settings = get_settings()
index_manager = get_index_manager()


def query_rag(
    message: str,
    history: List[Tuple[str, str]],
    top_k: int = 5,
) -> str:
    """
    Query the RAG system and return a response.

    Args:
        message: User's question
        history: Chat history (not used currently, but available for context)
        top_k: Number of top similar documents to retrieve

    Returns:
        Generated answer with sources
    """
    if not message.strip():
        return "Please enter a question."

    try:
        # Get the index and create query engine
        index = index_manager.index
        query_engine = index.as_query_engine(similarity_top_k=top_k)

        # Execute query
        response = query_engine.query(message)

        # Format the response with sources
        answer_text = str(response)

        # Extract and format sources
        sources = []
        for i, node in enumerate(getattr(response, "source_nodes", []) or [], 1):
            metadata = node.metadata or {}
            score = getattr(node, "score", None)

            source_info = f"\n**Source {i}**"
            if score is not None:
                source_info += f" (Relevance: {score:.2%})"
            source_info += "\n"

            if metadata.get("source") == "local":
                source_info += f"- File: `{metadata.get('path', 'Unknown')}`"
            elif metadata.get("url"):
                source_info += f"- URL: {metadata.get('url')}"
            else:
                source_info += "- Source: Unknown"

            sources.append(source_info)

        # Combine answer and sources
        full_response = answer_text
        if sources:
            full_response += "\n\n---\n### 📚 Sources:\n" + "\n".join(sources)

        return full_response

    except Exception as exc:
        return f"❌ Error: {str(exc)}\n\nPlease make sure the index is initialized. Run: `python -m src.updater.jobs`"


def create_gradio_interface() -> gr.Blocks:
    """
    Create and configure the Gradio interface.

    Returns:
        Configured Gradio Blocks interface
    """
    with gr.Blocks(
        title="RAG Seminararbeit - Q&A System",
    ) as demo:
        gr.Markdown(
            """
            # 🎓 RAG Seminararbeit - Q&A System
            
            Ask questions about your documents and get AI-powered answers with sources.
            """
        )

        with gr.Row():
            with gr.Column(scale=4):
                # Simple interface compatible with older Gradio versions
                with gr.Column():
                    question_input = gr.Textbox(
                        label="Your Question",
                        placeholder="Ask a question about your documents...",
                        lines=2,
                    )
                    top_k_slider = gr.Slider(
                        minimum=1,
                        maximum=10,
                        value=5,
                        step=1,
                        label="Number of Sources (top_k)",
                    )
                    submit_btn = gr.Button("Submit", variant="primary")
                    
                    answer_output = gr.Textbox(
                        label="Answer",
                        lines=15,
                        max_lines=30,
                    )
                    
                    # Examples
                    gr.Examples(
                        examples=[
                            ["What are the main topics in the documents?"],
                            ["Can you summarize the key points?"],
                            ["What information is available about data protection?"],
                        ],
                        inputs=question_input,
                    )
                    
                    # Connect the button
                    def simple_query(question, top_k):
                        return query_rag(question, [], top_k)
                    
                    submit_btn.click(
                        fn=simple_query,
                        inputs=[question_input, top_k_slider],
                        outputs=answer_output,
                    )

            with gr.Column(scale=1):
                gr.Markdown(
                    """
                    ### ℹ️ How to use:
                    
                    1. **Type your question** in the chat box
                    2. **Adjust top_k** to control how many sources to retrieve
                    3. **Press Enter** or click Submit
                    4. View the answer with relevant sources
                    
                    ### 💡 Tips:
                    
                    - Be specific in your questions
                    - Higher top_k = more sources but slower
                    - Sources show relevance scores
                    
                    ### 🔧 System Info:
                    
                    - **Model**: OpenAI GPT
                    - **Vector Store**: Chroma
                    - **Framework**: LlamaIndex
                    """
                )

        gr.Markdown(
            """
            ---
            ### 🚀 API Access
            
            This system also provides a REST API:
            - **Swagger UI**: [/docs](/docs)
            - **Health Check**: [/health](/health)
            """
        )

    return demo


# Create the interface instance
gradio_app = create_gradio_interface()


if __name__ == "__main__":
    # Run standalone
    gradio_app.launch(
        server_name="127.0.0.1",
        server_port=7860,
        share=False,
    )

