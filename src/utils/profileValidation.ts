export interface ProfileFormInput {
  displayName: string;
  bio: string;
}

export interface ProfileFormErrors {
  displayName?: string;
}

/**
 * Validates the profile edit form.
 * Pure function — no side effects.
 */
export const validateProfileForm = (form: ProfileFormInput): ProfileFormErrors => {
  const errors: ProfileFormErrors = {};

  if (!form.displayName.trim()) {
    errors.displayName = 'Display name is required.';
  } else if (form.displayName.trim().length > 50) {
    errors.displayName = 'Display name must be 50 characters or less.';
  }

  return errors;
};
