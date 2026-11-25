import os
from pathlib import Path
from typing import Annotated, TypedDict
from dotenv import load_dotenv
from langchain_ollama import ChatOllama
from langchain_core.messages import AIMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from agents.tools import consultar_facturas_postgres

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

tools = [consultar_facturas_postgres]

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b").strip()
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").strip()
UNAVAILABLE_MSG = (
    f"El asistente local no está disponible: verifica que Ollama esté activo "
    f"en {OLLAMA_BASE_URL} y que el modelo '{OLLAMA_MODEL}' esté descargado."
)

SYSTEM_PROMPT = SystemMessage(
    content=(
        "Eres el Orquestador Financiero de PluriOne FinTech. "
        "Cuando el usuario pregunte por facturas, folios, clientes, montos, "
        "conciliaciones o cuentas en riesgo/pendientes, DEBES usar la herramienta "
        "`consultar_facturas_postgres` para obtener los datos reales de PostgreSQL. "
        "Nunca inventes cifras, folios ni estados; reporta exactamente los valores "
        "devueltos por la herramienta."
    )
)


class AgentState(TypedDict):
    messages: Annotated[list, add_messages]


def build_model(model_name: str):
    llm = ChatOllama(
        model=model_name,
        base_url=OLLAMA_BASE_URL,
        temperature=0,
    )
    return llm.bind_tools(tools)


def call_model(state: AgentState):
    history = state.get("messages", [])
    has_system = any(isinstance(msg, SystemMessage) for msg in history)
    input_messages = history if has_system else [SYSTEM_PROMPT, *history]

    try:
        model = build_model(OLLAMA_MODEL)
        response = model.invoke(input_messages)
        return {"messages": [response]}
    except Exception as exc:
        print(f"[AGENT ERROR] Falló {OLLAMA_MODEL}: {type(exc).__name__}: {exc}")
        return {"messages": [AIMessage(content=UNAVAILABLE_MSG)]}


def should_continue(state: AgentState):
    messages = state.get("messages", [])
    if not messages:
        return END
    last_message = messages[-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END


workflow = StateGraph(AgentState)
workflow.add_node("agent", call_model)
workflow.add_node("tools", ToolNode(tools))

workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", should_continue)
workflow.add_edge("tools", "agent")

memory = MemorySaver()
app_agent = workflow.compile(checkpointer=memory)