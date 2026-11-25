import os
from pathlib import Path
from typing import Annotated, TypedDict
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import AIMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from agents.tools import consultar_facturas_postgres

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

tools = [consultar_facturas_postgres]

UNAVAILABLE_MSG = "El asistente no está disponible: falta configurar la llave del modelo"
QUOTA_MSG = "Se alcanzó el límite de cuota del modelo actual (429). Intenta más tarde o cambia GEMINI_MODEL en .env."
BUSY_MSG = "El servicio de IA está saturado temporalmente (503). Intenta de nuevo en unos segundos."

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
    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        return None
    llm = ChatGoogleGenerativeAI(
        google_api_key=api_key,
        model=model_name,
        temperature=0,
        max_retries=0,
        timeout=15,
    )
    return llm.bind_tools(tools)


def _get_candidate_models() -> list[str]:
    configured = os.getenv("GEMINI_MODEL", "gemini-3.8-flash-lite").strip()
    ordered = [
        configured,
        "gemini-3.8-flash-lite",
        "gemini-2.5-pro",
        "gemini-3.8-flash",
    ]
    return [m for m in dict.fromkeys(ordered) if m]


def call_model(state: AgentState):
    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        return {"messages": [AIMessage(content=UNAVAILABLE_MSG)]}

    history = state.get("messages", [])
    has_system = any(isinstance(msg, SystemMessage) for msg in history)
    input_messages = history if has_system else [SYSTEM_PROMPT, *history]

    saw_quota_error = False

    for model_name in _get_candidate_models():
        try:
            model = build_model(model_name)
            if model is None:
                return {"messages": [AIMessage(content=UNAVAILABLE_MSG)]}
            response = model.invoke(input_messages)
            return {"messages": [response]}
        except Exception as exc:
            err_text = str(exc)
            if "429" in err_text or "RESOURCE_EXHAUSTED" in err_text:
                saw_quota_error = True
            print(f"[AGENT WARN] Falló {model_name}: {type(exc).__name__}: {exc}")

    fallback_msg = QUOTA_MSG if saw_quota_error else BUSY_MSG
    return {"messages": [AIMessage(content=fallback_msg)]}


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