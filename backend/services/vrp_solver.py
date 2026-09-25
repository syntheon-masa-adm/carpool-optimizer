from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
from typing import List, Optional

class VRPSolver:
    def solve(self, duration_matrix: List[List[int]], num_vehicles: int, vehicle_capacities: List[int], demands: List[int], starts: List[int], ends: List[int]) -> Optional[List[List[int]]]:
        manager = pywrapcp.RoutingIndexManager(
            len(duration_matrix),
            num_vehicles,
            starts,
            ends
        )
        
        routing = pywrapcp.RoutingModel(manager)
        
        def transit_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return duration_matrix[from_node][to_node]
            
        transit_callback_index = routing.RegisterTransitCallback(transit_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
        
        def demand_callback(from_index):
            from_node = manager.IndexToNode(from_index)
            return demands[from_node]
            
        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index,
            0,  # null capacity slack
            vehicle_capacities,  # vehicle maximum capacities
            True,  # start cumul to zero
            'Capacity'
        )
        
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_parameters.time_limit.seconds = 30
        
        solution = routing.SolveWithParameters(search_parameters)
        
        if not solution:
            return None
            
        routes = []
        for vehicle_id in range(num_vehicles):
            index = routing.Start(vehicle_id)
            route = []
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                route.append(node_index)
                index = solution.Value(routing.NextVar(index))
            node_index = manager.IndexToNode(index)
            route.append(node_index)
            routes.append(route)
            
        return routes
