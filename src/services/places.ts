const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

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

  const url = `${PLACES_BASE}/autocomplete/json?input=${encodeURIComponent(input)}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places autocomplete failed: ${res.status}`);

  const json = await res.json();
  if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API error: ${json.status}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.predictions ?? []).map((p: any) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text ?? p.description,
    secondaryText: p.structured_formatting?.secondary_text ?? '',
  }));
};

export const fetchPlaceDetails = async (placeId: string): Promise<PlaceDetail> => {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('Missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY');

  const fields = 'name,formatted_address,geometry,photos,rating';
  const url = `${PLACES_BASE}/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places details failed: ${res.status}`);

  const json = await res.json();
  if (json.status !== 'OK') throw new Error(`Places details API error: ${json.status}`);

  const result = json.result;
  return {
    placeId,
    name: result.name,
    address: result.formatted_address,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    photoReference: result.photos?.[0]?.photo_reference ?? null,
    rating: result.rating,
  };
};

export const getPhotoUrl = (photoReference: string, maxWidth = 400): string => {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  return `${PLACES_BASE}/photo?maxwidth=${maxWidth}&photo_reference=${encodeURIComponent(photoReference)}&key=${key}`;
};
