export const ROLE_LIST_FETCHED_SUCCESS_MSG = 'Role list fetched successfully';
export const ROLE_CATEGORIES_FETCHED_SUCCESS_MSG =
  'Role categories fetched successfully';
export const ROLE_CATEGORIES_WITH_ROLES_FETCHED_SUCCESS_MSG =
  'Role categories with roles fetched successfully';
export const ROLE_CATEGORIES_WITH_ROLES_FETCH_ERROR_MSG =
  'Error fetching role categories with roles';
export const ROLE_CREATED_SUCCESS_MSG = 'Role created successfully';
export const ROLE_UPDATED_SUCCESS_MSG = 'Role updated successfully';
export const ROLE_FETCHED_SUCCESS_MSG = 'Role fetched successfully';
export const ROLE_CATEGORY_NOT_FOUND_MSG = 'Role category not found';
export const ROLE_CATEGORY_SUBMODULES_FETCHED_SUCCESS_MSG =
  'Role category submodule permissions fetched successfully';
export const ROLE_NAME_MAX_LENGTH = 255;
export const ROLE_DESCRIPTION_MAX_LENGTH = 1000;
export const ROLE_NAME_MAX_LENGTH_MSG = `Role name must not exceed ${ROLE_NAME_MAX_LENGTH} characters`;
export const ROLE_DESCRIPTION_MAX_LENGTH_MSG = `Description must not exceed ${ROLE_DESCRIPTION_MAX_LENGTH} characters`;
export const ROLE_DUPLICATE_NAME_CATEGORY_MSG =
  'A role with this name already exists in the selected category';
export const ROLE_NOT_FOUND_MSG = 'Role not found';
export const ROLE_SUBMODULE_MODULE_UNAVAILABLE_MSG =
  'Submodule data is temporarily unavailable. Please try again later.';
export const ROLE_INVALID_SUBMODULES_MSG =
  'One or more submodule IDs are invalid';
export const ROLE_HIDDEN_SUBMODULES_NOT_ALLOWED_MSG =
  'Hidden modules cannot be assigned to this role category';
export const ROLE_SUBMODULE_ACCESS_REQUIRED_MSG =
  'At least one submodule must be enabled';
export const ROLE_DELETED_SUCCESS_MSG = 'Role deleted successfully';
/** Seeded `role_categories.name` for the platform Super Admin category (excluded from category-with-roles list). */
export const SUPER_ADMIN_ROLE_CATEGORY_NAME = 'Super Admin';

export const ROLE_CANNOT_DELETE_SUPER_ADMIN_MSG =
  'Super Admin role cannot be deleted';
