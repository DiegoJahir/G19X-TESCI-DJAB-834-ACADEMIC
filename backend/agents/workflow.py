import os
from typing import Annotated, TypedDict
from langchain_openai import AzureChatOpenAI, ChatOpenAI
from langchain_core.messages import AIMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

UNAVAILABLE_MSG = "El asistente no está disponible: falta configurar la llave del modelo"


class AgentState(TypedDict):
    messages: Annotated[list, add_messages]


# Lista de herramientas (en el siguiente paso agregaremos aquí la consulta real a PostgreSQL)
tools = []


def get_ai_model():
    llm = None
    if os.getenv("AZURE_OPENAI_API_KEY"):
        llm = AzureChatOpenAI(
            azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
            temperature=0.1,
        )
    elif os.getenv("OPENAI_API_KEY"):
        llm = ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            temperature=0.1,
        )

    if llm is None:
        return None
    return llm.bind_tools(tools) if tools else llm


def call_model(state: AgentState):
    model = get_ai_model()
    if model is None:
        return {"messages": [AIMessage(content=UNAVAILABLE_MSG)]}

    try:
        response = model.invoke(state["messages"])
        return {"messages": [response]}
    except Exception:
        return {"messages": [AIMessage(content=UNAVAILABLE_MSG)]}


def should_continue(state: AgentState):
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END


workflow = StateGraph(AgentState)
workflow.add_node("agent", call_model)
workflow.set_entry_point("agent")

if tools:
    workflow.add_node("tools", ToolNode(tools))
    workflow.add_conditional_edges("agent", should_continue)
    workflow.add_edge("tools", "agent")
else:
    workflow.add_edge("agent", END)

app_agent = workflow.compile()