export type DriverInput = { id: string; name: string; address: string; capacity: number };
export type PassengerInput = { id: string; name: string; address: string };
export type Location = { lat: number; lng: number; address: string; name?: string };
export type PickupPoint = { location: Location; poi_name: string; poi_type: string; assigned_passengers: string[] };
export type DriverRoute = { driver_name: string; origin: Location; pickup_points: PickupPoint[]; destination: Location; passengers: string[]; total_duration_minutes: number; total_distance_km: number; polyline: string; vehicle_capacity: number; passenger_count: number };
export type OptimizeResponse = { routes: DriverRoute[]; pickup_points: PickupPoint[]; summary: { total_drivers: number; total_passengers: number; total_duration_minutes: number; unassigned_passengers: string[] } };
export type OptimizeRequest = { drivers: Omit<DriverInput, 'id'>[]; passengers: Omit<PassengerInput, 'id'>[]; destination: string; destination_name?: string; k: number; search_radius_km: number };
