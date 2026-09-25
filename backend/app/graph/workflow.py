from langgraph.graph import StateGraph, START, END
from langgraph.constants import Send

from app.graph.state import EvalState
from app.graph.nodes import evaluate_cv_node, rank_all_node


def route_to_evaluators(state: EvalState):
    """Fans out one Send per parsed CV. CVs that already failed parsing
    still get sent through (evaluate_cv_node short-circuits them)."""
    return [
        Send("evaluate_cv", {"jd_text": state["jd_text"], "cv": cv})
        for cv in state["input_cvs"]
    ]


def build_graph():
    graph = StateGraph(EvalState)

    graph.add_node("evaluate_cv", evaluate_cv_node)
    graph.add_node("rank_all", rank_all_node)

    graph.add_conditional_edges(START, route_to_evaluators, ["evaluate_cv"])
    graph.add_edge("evaluate_cv", "rank_all")
    graph.add_edge("rank_all", END)

    return graph.compile()


compiled_graph = build_graph()