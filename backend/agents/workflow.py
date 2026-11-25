import os
from typing import Annotated, TypedDict
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import AIMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from agents.tools import consultar_facturas_postgres

load_dotenv()

tools = [consultar_facturas_postgres]

UNAVAILABLE_MSG = "El asistente no está disponible: falta configurar la llave del modelo"

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


def get_ai_model():
    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        return None

    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    llm = ChatGoogleGenerativeAI(
        google_api_key=api_key,
        model=model_name,
        temperature=0,
    )
    return llm.bind_tools(tools)


def call_model(state: AgentState):
    model = get_ai_model()
    if model is None:
        return {"messages": [AIMessage(content=UNAVAILABLE_MSG)]}

    history = state.get("messages", [])
    if history and isinstance(history[0], SystemMessage):
        input_messages = history
    else:
        input_messages = [SYSTEM_PROMPT, *history]

    try:
        response = model.invoke(input_messages)
        return {"messages": [response]}
    except Exception:
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