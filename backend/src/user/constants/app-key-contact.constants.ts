export const APP_KEY_CONTACTS_LIST_FETCHED_SUCCESS_MSG =
  'Key contacts fetched successfully';
export const APP_KEY_CONTACTS_LIST_FAILED_MSG = 'Failed to fetch key contacts';
export const APP_KEY_CONTACTS_LIST_FETCH_ERROR_LOG_MSG =
  'Error fetching app_key_contacts list';

/** GET /key-contacts — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const APP_KEY_CONTACTS_LIST_FORBIDDEN_MSG =
  'You do not have permission to view key contacts.';

/** CompanyAdmin has no admin `user_company_access` on a non-deleted company. */
export const APP_KEY_CONTACTS_LIST_COMPANY_ADMIN_UNASSIGNED_MSG =
  'No company is linked to this account as company admin.';

/** CompanyAdmin requested `companyIds` outside their admin companies. */
export const APP_KEY_CONTACTS_LIST_COMPANY_ADMIN_WRONG_COMPANY_MSG =
  'You may only view key contacts for your assigned company.';

/** CorporationAdmin requested `corporationIds` or companies outside their corporation. */
export const APP_KEY_CONTACTS_LIST_CORP_ADMIN_WRONG_CORP_MSG =
  'You may only view key contacts under your corporation.';

/** CompanyAdmin requested `corporationIds` outside their assigned companies. */
export const APP_KEY_CONTACTS_LIST_COMPANY_ADMIN_WRONG_CORP_MSG =
  'You may only filter key contacts by corporations for your assigned company.';

export const APP_KEY_CONTACT_VIEW_FETCHED_SUCCESS_MSG =
  'Key contact details fetched successfully.';
export const APP_KEY_CONTACT_VIEW_FAILED_MSG =
  'Failed to fetch key contact details. Please try again later.';
export const APP_KEY_CONTACT_VIEW_FETCH_ERROR_LOG_MSG =
  'Error fetching app key contact by id';
export const APP_KEY_CONTACT_NOT_FOUND_MSG = 'Key contact not found.';

export const APP_KEY_CONTACT_CREATED_MSG = 'Key contact created successfully.';
/** POST /key-contacts — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const APP_KEY_CONTACT_CREATE_FORBIDDEN_MSG =
  'You do not have permission to create key contacts.';
export const APP_KEY_CONTACT_CREATE_FAILED_MSG =
  'Failed to create key contact. Please try again later.';
export const APP_KEY_CONTACT_CREATE_ERROR_LOG_MSG =
  'Error creating app key contact';
export const APP_KEY_CONTACT_COMPANY_NOT_FOUND_MSG =
  'Either corporation or company name is incorrect';
export const APP_KEY_CONTACT_CORPORATION_NOT_FOUND_MSG =
  'Corporation not found.';
export const APP_KEY_CONTACT_COMPANY_CORPORATION_MISMATCH_MSG =
  'The company does not belong to the specified corporation.';

/** POST /key-contacts — CorporationAdmin scoped corporationId or companyId outside their corporation. */
export const APP_KEY_CONTACT_CREATE_CORP_ADMIN_WRONG_CORP_MSG =
  'You may only create key contacts under your corporation.';
/** POST /key-contacts — CompanyAdmin scoped companyId outside their admin companies. */
export const APP_KEY_CONTACT_CREATE_COMPANY_ADMIN_WRONG_COMPANY_MSG =
  'You may only create key contacts for your assigned company.';
/** POST /key-contacts — CompanyAdmin scoped corporationId outside their assigned companies. */
export const APP_KEY_CONTACT_CREATE_COMPANY_ADMIN_WRONG_CORP_MSG =
  'You may only create key contacts under corporations for your assigned company.';

export const APP_KEY_CONTACT_UPDATED_MSG = 'Key contact updated successfully.';
/** PATCH /key-contacts/:id — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const APP_KEY_CONTACT_UPDATE_FORBIDDEN_MSG =
  'You do not have permission to update key contacts.';
/** PATCH /key-contacts/:id — CorporationAdmin scoped corporationId or companyId outside their corporation. */
export const APP_KEY_CONTACT_UPDATE_CORP_ADMIN_WRONG_CORP_MSG =
  'You may only update key contacts under your corporation.';
/** PATCH /key-contacts/:id — CompanyAdmin scoped companyId outside their admin companies. */
export const APP_KEY_CONTACT_UPDATE_COMPANY_ADMIN_WRONG_COMPANY_MSG =
  'You may only update key contacts for your assigned company.';
/** PATCH /key-contacts/:id — CompanyAdmin scoped corporationId outside their assigned companies. */
export const APP_KEY_CONTACT_UPDATE_COMPANY_ADMIN_WRONG_CORP_MSG =
  'You may only update key contacts under corporations for your assigned company.';
export const APP_KEY_CONTACT_UPDATE_FAILED_MSG =
  'Failed to update key contact. Please try again later.';
export const APP_KEY_CONTACT_UPDATE_ERROR_LOG_MSG =
  'Error updating app key contact';

export const APP_KEY_CONTACT_SOFT_DELETED_MSG =
  'Key contact deleted successfully.';
/** DELETE /key-contacts/:id — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const APP_KEY_CONTACT_SOFT_DELETE_FORBIDDEN_MSG =
  'You do not have permission to delete key contacts.';
/** DELETE /key-contacts/:id — CorporationAdmin target outside their corporation. */
export const APP_KEY_CONTACT_SOFT_DELETE_CORP_ADMIN_WRONG_CORP_MSG =
  'You may only delete key contacts under your corporation.';
/** DELETE /key-contacts/:id — CompanyAdmin target outside their admin companies. */
export const APP_KEY_CONTACT_SOFT_DELETE_COMPANY_ADMIN_WRONG_COMPANY_MSG =
  'You may only delete key contacts for your assigned company.';
/** DELETE /key-contacts/:id — CompanyAdmin target corporation outside their assigned companies. */
export const APP_KEY_CONTACT_SOFT_DELETE_COMPANY_ADMIN_WRONG_CORP_MSG =
  'You may only delete key contacts under corporations for your assigned company.';
export const APP_KEY_CONTACT_SOFT_DELETE_FAILED_MSG =
  'Failed to delete key contact. Please try again later.';
export const APP_KEY_CONTACT_SOFT_DELETE_ERROR_LOG_MSG =
  'Error soft-deleting app key contact';
/** Delete is only allowed for standalone directory contacts (same scope as PATCH). */
export const APP_KEY_CONTACT_DELETE_LINKED_TO_USER_MSG =
  'This key contact is linked to an app user and cannot be deleted.';
export const APP_KEY_CONTACT_UPDATE_EMPTY_BODY_MSG =
  'At least one field must be provided.';

/** Another non-deleted app_key_contacts row already has this email. */
export const APP_KEY_CONTACT_EMAIL_DUPLICATE_MSG =
  'Another key contact is already using this email address.';

/** app_users has a non-deleted user with this email (case-insensitive). */
export const APP_KEY_CONTACT_EMAIL_USED_BY_APP_USER_MSG =
  'This email address is already in use by an app user.';

export const APP_KEY_CONTACT_INVITE_SUCCESS_MSG =
  'Key contact invited successfully.';
/** POST /key-contacts/:id/invite — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const APP_KEY_CONTACT_INVITE_FORBIDDEN_MSG =
  'You do not have permission to invite key contacts.';
/** POST /key-contacts/:id/invite — CorporationAdmin target outside their corporation. */
export const APP_KEY_CONTACT_INVITE_CORP_ADMIN_WRONG_CORP_MSG =
  'You may only invite key contacts under your corporation.';
/** POST /key-contacts/:id/invite — CompanyAdmin target outside their admin companies. */
export const APP_KEY_CONTACT_INVITE_COMPANY_ADMIN_WRONG_COMPANY_MSG =
  'You may only invite key contacts for your assigned company.';
/** POST /key-contacts/:id/invite — CompanyAdmin target corporation outside their assigned companies. */
export const APP_KEY_CONTACT_INVITE_COMPANY_ADMIN_WRONG_CORP_MSG =
  'You may only invite key contacts under corporations for your assigned company.';
export const APP_KEY_CONTACT_INVITE_FAILED_MSG =
  'Failed to invite key contact. Please try again later.';
export const APP_KEY_CONTACT_INVITE_ERROR_LOG_MSG =
  'Error inviting app key contact';
export const APP_KEY_CONTACT_INVITE_MISSING_CORPORATION_OR_COMPANY_MSG =
  'Corporation and company must be set on the key contact before sending an invite.';
export const APP_KEY_CONTACT_INVITE_ALREADY_LINKED_MSG =
  'This key contact is already linked to an app user.';

/** `app_key_contacts.status` after a successful app user invite. */
export const APP_KEY_CONTACT_STATUS_INVITED = 'Invited';
