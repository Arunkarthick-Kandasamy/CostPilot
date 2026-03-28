from crewai import Agent, Task, Crew, Process
from costpilot_common.llm import get_llm
from resource_agent.tools.utilization_analyzer import get_license_utilization, get_infrastructure_utilization
from resource_agent.tools.consolidation_planner import find_consolidation_opportunities
from resource_agent.tools.cost_allocator import get_cost_allocation_by_team


def create_resource_crew() -> Crew:
    llm = get_llm()

    utilization_analyzer = Agent(
        role="Utilization Analyzer",
        goal="Track usage across licenses, infrastructure, tools, and teams to find waste.",
        backstory="You are an IT operations expert who maximizes resource ROI.",
        tools=[get_license_utilization, get_infrastructure_utilization],
        llm=llm, verbose=True,
    )

    consolidation_planner = Agent(
        role="Consolidation Planner",
        goal="Identify underused resources and propose consolidation to reduce costs.",
        backstory="You are a cloud architect who eliminates infrastructure waste.",
        tools=[find_consolidation_opportunities],
        llm=llm, verbose=True,
    )

    cost_allocator = Agent(
        role="Cost Allocator",
        goal="Attribute costs to teams and projects for accountability and optimization.",
        backstory="You are a FinOps analyst who drives cost accountability across the org.",
        tools=[get_cost_allocation_by_team],
        llm=llm, verbose=True,
    )

    analyze_util = Task(
        description="Analyze license and infrastructure utilization. Identify all resources below 50% utilization. Calculate wasted spend.",
        expected_output="JSON list of underutilized resources with type, name, utilization_pct, waste_amount.",
        agent=utilization_analyzer,
    )

    plan_consolidation = Task(
        description="Based on utilization data, propose specific consolidation actions: cancel licenses, decommission servers, merge tools.",
        expected_output="JSON list of consolidation proposals with action, resource, monthly_savings, risk.",
        agent=consolidation_planner,
    )

    allocate_costs = Task(
        description="Generate cost allocation by team. Highlight teams with disproportionate spend relative to output.",
        expected_output="JSON list of team cost allocations with team, category, amount, and efficiency_flag.",
        agent=cost_allocator,
    )

    return Crew(
        agents=[utilization_analyzer, consolidation_planner, cost_allocator],
        tasks=[analyze_util, plan_consolidation, allocate_costs],
        process=Process.sequential, verbose=True,
    )
