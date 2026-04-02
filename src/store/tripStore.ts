import { create } from 'zustand';
import { Trip, Destination } from '@app-types/index';

interface TripState {
  trips: Trip[];
  activeTrip: Trip | null;
  destinations: Destination[];
  isLoading: boolean;
  error: string | null;
  setTrips: (trips: Trip[]) => void;
  setActiveTrip: (trip: Trip | null) => void;
  setDestinations: (destinations: Destination[]) => void;
  addTrip: (trip: Trip) => void;
  updateTrip: (id: string, data: Partial<Trip>) => void;
  removeTrip: (id: string) => void;
  addDestination: (destination: Destination) => void;
  updateDestination: (id: string, data: Partial<Destination>) => void;
  removeDestination: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTripStore = create<TripState>((set) => ({
  trips: [],
  activeTrip: null,
  destinations: [],
  isLoading: false,
  error: null,
  setTrips: (trips) => set({ trips }),
  setActiveTrip: (activeTrip) => set({ activeTrip }),
  setDestinations: (destinations) => set({ destinations }),
  addTrip: (trip) => set((state) => ({ trips: [trip, ...state.trips] })),
  updateTrip: (id, data) =>
    set((state) => ({
      trips: state.trips.map((t) => (t.id === id ? { ...t, ...data } : t)),
    })),
  removeTrip: (id) => set((state) => ({ trips: state.trips.filter((t) => t.id !== id) })),
  addDestination: (destination) =>
    set((state) => ({ destinations: [...state.destinations, destination] })),
  updateDestination: (id, data) =>
    set((state) => ({
      destinations: state.destinations.map((d) => (d.id === id ? { ...d, ...data } : d)),
    })),
  removeDestination: (id) =>
    set((state) => ({ destinations: state.destinations.filter((d) => d.id !== id) })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
