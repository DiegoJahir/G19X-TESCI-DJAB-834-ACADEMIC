import os
import re
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
    "El asistente no está disponible: falta configurar la llave del modelo "
    f"o verificar el servicio local en {OLLAMA_BASE_URL}."
)

SYSTEM_PROMPT = SystemMessage(
    content=(
        "Eres el Orquestador Financiero de PluriOne FinTech. "
        "Tienes la herramienta `consultar_facturas_postgres` conectada a PostgreSQL. "
        "REGLA: Si el usuario pregunta por facturas, folios, clientes, montos, pagos, "
        "conciliación, alertas, discrepancias, riesgo, ingresos, flujo financiero, "
        "depósitos no identificados o sincronización con PostgreSQL, llama SIEMPRE "
        "primero a `consultar_facturas_postgres` (con folio='' y estado=''). "
        "Si se menciona un folio (como FAC-1021, FAC-1022 o FAC-1023), reporta su "
        "estado real aunque esté Conciliado y aclara si hay o no facturas pendientes "
        "o en riesgo. Responde directo con los folios, montos, pagos, saldos "
        "pendientes y estados reales de PostgreSQL. Si preguntan por depósitos no "
        "identificados o movimientos externos, indica que la herramienta consulta "
        "facturas en PostgreSQL y muestra las facturas registradas. No uses "
        "asteriscos (**) ni comillas invertidas (`)."
    )
)


def _clean_text(text: str) -> str:
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    cleaned = cleaned.replace("**", "").replace("`", "")
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()

FINANCIAL_KEYWORDS = (
    "factura", "folio", "cliente", "monto", "pago", "pagado", "saldo",
    "concili", "riesgo", "alerta", "discrep", "ingreso", "pandas",
    "flujo", "reporte", "resumen", "depósito", "deposito", "sincron",
    "postgres", "base de datos", "pendiente", "parcial", "corte", "cuenta",
)

def _needs_postgres_lookup(text: str) -> bool:
    q = (text or "").lower()
    return any(word in q for word in FINANCIAL_KEYWORDS)

def _has_tool_in_current_turn(history: list) -> bool:
    for msg in reversed(history):
        msg_type = getattr(msg, "type", "")
        if msg_type == "tool":
            return True
        if msg_type == "human":
            return False
    return False

def _has_tool_message(history: list) -> bool:
    return any(getattr(msg, "type", "") == "tool" for msg in history)

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]


def build_model(model_name: str):
    if not model_name:
        raise ValueError("Modelo no configurado")
    llm = ChatOllama(
        model=model_name,
        base_url=OLLAMA_BASE_URL,
        temperature=0,
        num_predict=400,
    )
    return llm.bind_tools(tools)


def call_model(state: AgentState):
    history = state.get("messages", [])
    non_system_messages = [msg for msg in history if not isinstance(msg, SystemMessage)]
    input_messages = [SYSTEM_PROMPT, *non_system_messages]

    last_user_text = ""
    for msg in reversed(non_system_messages):
        if getattr(msg, "type", "") == "human":
            last_user_text = str(msg.content or "")
            break

    try:
        model = build_model(OLLAMA_MODEL)
        response = model.invoke(input_messages)

        has_calls = bool(getattr(response, "tool_calls", None))
        if (
            not has_calls
            and not _has_tool_in_current_turn(non_system_messages)
            and _needs_postgres_lookup(last_user_text)
        ):
            forced_call = AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "consultar_facturas_postgres",
                        "args": {"folio": "", "estado": ""},
                        "id": "call_auto_postgres_01",
                    }
                ],
            )
            return {"messages": [forced_call]}

        if isinstance(response, AIMessage) and isinstance(response.content, str) and response.content:
            response.content = _clean_text(response.content)
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