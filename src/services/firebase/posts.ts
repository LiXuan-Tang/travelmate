import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
  QueryDocumentSnapshot,
  QueryConstraint,
  getDocs,
} from 'firebase/firestore';
import { db } from './config';
import { deleteImage } from './storage';
import { Post, Comment } from '@app-types/index';
import { COLLECTIONS } from '@constants/index';

const PAGE_SIZE = 10;

// ─── Feed ─────────────────────────────────────────────────────────────────────

export const fetchPublicPosts = async (
  afterDoc: QueryDocumentSnapshot | null,
): Promise<{ posts: Post[]; lastDoc: QueryDocumentSnapshot | null }> => {
  const constraints: QueryConstraint[] = [
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE),
  ];
  if (afterDoc) constraints.push(startAfter(afterDoc));

  try {
    const snap = await getDocs(query(collection(db, COLLECTIONS.POSTS), ...constraints));
    const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);
    const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    return { posts, lastDoc };
  } catch (e: unknown) {
    throw e;
  }
};

export const subscribeToUserPosts = (
  uid: string,
  callback: (posts: Post[]) => void,
): (() => void) => {
  const q = query(
    collection(db, COLLECTIONS.POSTS),
    where('authorId', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post));
  });
};

// ─── Post CRUD ────────────────────────────────────────────────────────────────

export const createPost = async (
  data: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likesCount' | 'commentsCount'>,
): Promise<string> => {
  const ref = await addDoc(collection(db, COLLECTIONS.POSTS), {
    ...data,
    likesCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updatePost = async (postId: string, data: Partial<Post>): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.POSTS, postId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deletePost = async (postId: string, images: string[]): Promise<void> => {
  // Delete Storage images first (non-fatal if any fail)
  await Promise.allSettled(
    images
      .filter((url) => url.includes('firebasestorage'))
      .map((url) => {
        try {
          const path = decodeURIComponent(url.split('/o/')[1].split('?')[0]);
          return deleteImage(path);
        } catch {
          return Promise.resolve();
        }
      }),
  );

  // Delete all comments subcollection docs
  const commentsSnap = await getDocs(
    collection(db, COLLECTIONS.POSTS, postId, COLLECTIONS.COMMENTS),
  );
  const batch = writeBatch(db);
  commentsSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, COLLECTIONS.POSTS, postId));
  await batch.commit();
};

// ─── Likes ────────────────────────────────────────────────────────────────────

export const toggleLike = async (
  postId: string,
  uid: string,
  isLiked: boolean,
): Promise<void> => {
  const batch = writeBatch(db);
  batch.update(doc(db, COLLECTIONS.POSTS, postId), {
    likesCount: increment(isLiked ? -1 : 1),
  });
  batch.update(doc(db, COLLECTIONS.USERS, uid), {
    likedPostIds: isLiked ? arrayRemove(postId) : arrayUnion(postId),
  });
  await batch.commit();
};

// ─── Saves ────────────────────────────────────────────────────────────────────

export const toggleSaved = async (
  postId: string,
  uid: string,
  isSaved: boolean,
): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    savedPostIds: isSaved ? arrayRemove(postId) : arrayUnion(postId),
  });
};

// ─── Comments ─────────────────────────────────────────────────────────────────

export const subscribeToComments = (
  postId: string,
  callback: (comments: Comment[]) => void,
): (() => void) => {
  const q = query(
    collection(db, COLLECTIONS.POSTS, postId, COLLECTIONS.COMMENTS),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment));
  });
};

export const addComment = async (
  postId: string,
  uid: string,
  text: string,
): Promise<string> => {
  const batch = writeBatch(db);
  const commentRef = doc(
    collection(db, COLLECTIONS.POSTS, postId, COLLECTIONS.COMMENTS),
  );
  batch.set(commentRef, {
    postId,
    authorId: uid,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, COLLECTIONS.POSTS, postId), {
    commentsCount: increment(1),
  });
  await batch.commit();
  return commentRef.id;
};

export const deleteComment = async (
  postId: string,
  commentId: string,
): Promise<void> => {
  const batch = writeBatch(db);
  batch.delete(doc(db, COLLECTIONS.POSTS, postId, COLLECTIONS.COMMENTS, commentId));
  batch.update(doc(db, COLLECTIONS.POSTS, postId), {
    commentsCount: increment(-1),
  });
  await batch.commit();
};
