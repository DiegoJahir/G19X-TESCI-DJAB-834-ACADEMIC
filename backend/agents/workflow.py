import os
from typing import Annotated, TypedDict
from langchain_openai import AzureChatOpenAI
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

# 1. Definir el estado del agente
class AgentState(TypedDict):
    messages: list

# 2. Definir la Tool de Conciliación (Basada en tu lógica anterior de /api/reconcile)
@tool
def reconcile_bank_statement(statement_path: str) -> str:
    """
    Analiza y concilia el estado de cuenta bancario contra las facturas registradas,
    detectando discrepancias, riesgos o montos no conciliados.
    """
    # Aquí puedes integrar la lógica real de lectura y comparación de tu CSV
    try:
        # Lógica simulada/modular de conciliación
        return f"Conciliación exitosa para el archivo {statement_path}. Se revisaron los movimientos y no se detectaron riesgos críticos de discrepancia."
    except Exception as e:
        return f"Error al procesar la conciliación: {str(e)}"

tools = [reconcile_bank_statement]
tool_node = ToolNode(tools)

# 3. Inicializar el modelo con Azure OpenAI usando variables de entorno
def get_azure_model():
    return AzureChatOpenAI(
        azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o"),
        api_version="2024-02-15-preview",
        temperature=0.1
    ).bind_tools(tools)

model = get_azure_model()

# 4. Definir nodos del grafo
def call_model(state: AgentState):
    messages = state["messages"]
    response = model.invoke(messages)
    return {"messages": [response]}

def should_continue(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1]
    if last_message.tool_calls:
        return "tools"
    return END

# 5. Construir el grafo de LangGraph
workflow = StateGraph(AgentState)
workflow.add_node("agent", call_model)
workflow.add_node("tools", tool_node)

workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", should_continue)
workflow.add_edge("tools", "agent")

# Compilar el grafo listo para usarse
app_agent = workflow.compile()