import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

export const uploadImage = async (uri: string, path: string): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
};

export const deleteImage = async (path: string): Promise<void> => {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};

export const getImageURL = async (path: string): Promise<string> => {
  return await getDownloadURL(ref(storage, path));
};
