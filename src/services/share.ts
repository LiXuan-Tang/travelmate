import { createPost } from './firebase/posts';
import { generateShareLink } from './firebase/dynamicLinks';

export interface PublishItineraryParams {
  authorId: string;
  tripId: string;
  title: string;
  destination: string;
  destinationCount: number;
  tripDuration: string;
  body?: string;
  tags?: string[];
  images?: string[];
}

export interface PublishItineraryResult {
  postId: string;
  shareLink: string;
}

/**
 * Validates and publishes a trip itinerary as a community post.
 * Returns the new post ID and its shareable HTTPS link.
 */
export async function publishItinerary(
  params: PublishItineraryParams,
): Promise<PublishItineraryResult> {
  const { authorId, tripId, title, destination, destinationCount, tripDuration } = params;

  if (!tripId?.trim()) {
    throw new Error('Trip ID is required to share itinerary');
  }
  if (!destination?.trim()) {
    throw new Error('Destination is required to share itinerary');
  }
  if (!destinationCount || destinationCount < 1) {
    throw new Error('Itinerary must have at least one destination to share');
  }

  const postId = await createPost({
    authorId,
    title: title?.trim() || destination,
    body: params.body ?? '',
    images: params.images ?? [],
    destination,
    tags: params.tags ?? [],
    visibility: 'public',
    type: 'shared_itinerary',
    tripId,
    destinationCount,
    tripDuration,
  });

  const shareLink = generateShareLink(postId);
  return { postId, shareLink };
}
