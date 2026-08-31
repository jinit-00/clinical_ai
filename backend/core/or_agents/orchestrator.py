import datetime
import logging
from typing import Dict, Any, List
from core.or_agents.agent_handlers import (
    agent_briefing,
    agent_timeout,
    agent_protocol,
    agent_decision,
    agent_complication,
    agent_ebl,
    agent_drug,
    agent_anatomy,
    agent_op_report,
    agent_handoff,
    agent_visual_intel,
    agent_visual_asst
)

logger = logging.getLogger(__name__)

class Orchestrator:
    def __init__(self):
        self.event_log: List[Dict[str, Any]] = []

    def clear_log(self):
        self.event_log = []

    async def route_and_execute(
        self,
        query: str,
        target_agent: str,
        current_entry: Dict[str, Any],
        patient_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Routes user query text to one of the 12 specialized OR agents.
        Appends the interaction to the running session event log.
        """
        agent_clean = target_agent.lower().strip() if target_agent else "decision"
        q_lower = query.lower()

        # Intent classification fallback if target_agent is "auto" or empty
        if agent_clean == "auto" or not agent_clean:
            if "brief" in q_lower or "allergy" in q_lower or "history" in q_lower:
                agent_clean = "briefing"
            elif "timeout" in q_lower or "checklist" in q_lower:
                agent_clean = "timeout"
            elif "protocol" in q_lower:
                agent_clean = "protocol"
            elif "bleed" in q_lower or "drop" in q_lower or "complication" in q_lower:
                agent_clean = "complication"
            elif "ebl" in q_lower or "loss" in q_lower or "blood" in q_lower:
                agent_clean = "ebl"
            elif "drug" in q_lower or "cefazolin" in q_lower or "safe" in q_lower:
                agent_clean = "drug"
            elif "danger" in q_lower or "risk" in q_lower or "anatomy" in q_lower:
                agent_clean = "anatomy"
            elif "op report" in q_lower or "report" in q_lower or "specimen" in q_lower:
                agent_clean = "op_report"
            elif "handoff" in q_lower or "sbar" in q_lower:
                agent_clean = "handoff"
            elif "see" in q_lower or "field" in q_lower or "visual" in q_lower:
                agent_clean = "visual_intel"
            else:
                agent_clean = "decision"

        # Map to specific handler
        agent_map = {
            "briefing": agent_briefing,
            "timeout": agent_timeout,
            "protocol": agent_protocol,
            "decision": agent_decision,
            "complication": agent_complication,
            "ebl": agent_ebl,
            "drug": agent_drug,
            "anatomy": agent_anatomy,
            "op_report": agent_op_report,
            "handoff": agent_handoff,
            "visual_intel": agent_visual_intel,
            "visual_asst": agent_visual_asst
        }

        handler = agent_map.get(agent_clean, agent_decision)
        response_text = await handler(query, current_entry, patient_data, self.event_log)

        timestamp = datetime.datetime.now().strftime("%H:%M:%S")

        event_item = {
            "timestamp": timestamp,
            "agent": agent_clean,
            "phase": current_entry.get("phase", "General"),
            "query": query,
            "response": response_text
        }
        self.event_log.append(event_item)

        return {
            "agent": agent_clean,
            "query": query,
            "response_text": response_text,
            "timestamp": timestamp,
            "event_log": self.event_log
        }

orchestrator = Orchestrator()
