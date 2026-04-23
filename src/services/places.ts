const PLACES_BASE = 'https://places.googleapis.com/v1';

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetail {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  photoReference: string | null;
  rating?: number;
}

export const searchPlaces = async (input: string): Promise<PlacePrediction[]> => {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('Missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY');

  const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({ input }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Places autocomplete failed: ${res.status} — ${json.error?.message ?? JSON.stringify(json)}`);
  if (json.error) throw new Error(`Places API error: ${json.error.message}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.suggestions ?? []).map((s: any) => {
    const pp = s.placePrediction;
    return {
      placeId: pp.placeId,
      description: pp.text?.text ?? '',
      mainText: pp.structuredFormat?.mainText?.text ?? pp.text?.text ?? '',
      secondaryText: pp.structuredFormat?.secondaryText?.text ?? '',
    };
  });
};

export const fetchPlaceDetails = async (placeId: string): Promise<PlaceDetail> => {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('Missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY');

  const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,photos,rating',
    },
  });
  if (!res.ok) throw new Error(`Places details failed: ${res.status}`);

  const json = await res.json();
  if (json.error) throw new Error(`Places details API error: ${json.error.message}`);

  return {
    placeId,
    name: json.displayName?.text ?? '',
    address: json.formattedAddress ?? '',
    lat: json.location?.latitude ?? 0,
    lng: json.location?.longitude ?? 0,
    photoReference: json.photos?.[0]?.name ?? null,
    rating: json.rating,
  };
};

export const getPhotoUrl = (photoReference: string, maxWidth = 400): string => {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  return `${PLACES_BASE}/${photoReference}/media?maxWidthPx=${maxWidth}&key=${key}`;
};

export interface PlacePhotoResult {
  url: string | null;
  photoRef: string | null;
}

export interface TextSearchPlace {
  placeId: string;
  name: string;
  address: string;
  photoReference: string | null;
  rating?: number;
  lat: number;
  lng: number;
}

/**
 * Full text search returning rich place results (name, address, rating, photo).
 * Used for category browsing on the Explore screen.
 */
export const searchTextPlaces = async (
  query: string,
  maxResults = 10,
): Promise<TextSearchPlace[]> => {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.photos,places.rating',
      },
      body: JSON.stringify({ textQuery: query, pageSize: maxResults }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.places ?? []).map((p: any) => ({
      placeId: p.id,
      name: p.displayName?.text ?? '',
      address: p.formattedAddress ?? '',
      photoReference: p.photos?.[0]?.name ?? null,
      rating: p.rating,
      lat: p.location?.latitude ?? 0,
      lng: p.location?.longitude ?? 0,
    }));
  } catch {
    return [];
  }
};

/**
 * Searches for a place by text query and returns both the display URL and the
 * raw photo reference (needed to persist in Destination.photoReference so the
 * itinerary screen can reconstruct the URL via getPhotoUrl).
 */
export const searchPlacePhoto = async (
  query: string,
  maxWidth = 600,
): Promise<PlacePhotoResult> => {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!key) return { url: null, photoRef: null };

  try {
    const res = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.photos',
      },
      body: JSON.stringify({ textQuery: query }),
    });
    if (!res.ok) return { url: null, photoRef: null };
    const json = await res.json();
    const photoRef: string | undefined = json.places?.[0]?.photos?.[0]?.name;
    if (!photoRef) return { url: null, photoRef: null };
    return { url: getPhotoUrl(photoRef, maxWidth), photoRef };
  } catch {
    return { url: null, photoRef: null };
  }
};
