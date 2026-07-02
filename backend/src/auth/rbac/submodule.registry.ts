/**
 * Canonical module + submodule catalog aligned with Figma role permissions grid.
 * `key` values are stable API guard identifiers.
 */
import { SUPER_ADMIN_ROLE_CATEGORY_NAME } from '../../role/constants/role.messages';

export type SubmoduleSeed = {
  key: string;
  name: string;
};

export type ModuleSeed = {
  name: string;
  sortOrder: number;
  /** Hidden from role permission grids unless the role category is Super Admin. */
  hidden?: boolean;
  submodules: SubmoduleSeed[];
};

/** Modules hidden from enable/disable grids for non–Super Admin role categories. */
export const HIDDEN_ROLE_GRID_MODULE_NAMES = [
  'Roles & Permissions',
  'Corporation Directory',
  'Company Directory',
  'Plan & Pricing',
  'Promo Code Management',
  'Invite Management',
] as const;

export const RBAC_MODULE_CATALOG: readonly ModuleSeed[] = [
  {
    name: 'Dashboard',
    sortOrder: 10,
    submodules: [{ key: 'dashboard.dashboard', name: 'Dashboard' }],
  },
  {
    name: 'Corporation Overview',
    sortOrder: 15,
    submodules: [
      {
        key: 'corporation_overview.view',
        name: 'View Corporation Overview',
      },
    ],
  },
  {
    name: 'Corporation Directory',
    sortOrder: 20,
    hidden: true,
    submodules: [
      {
        key: 'corporation_directory.add_new_corporation',
        name: 'Add New Corporation (Quick + Advance)',
      },
      {
        key: 'corporation_directory.view_corporation',
        name: 'View Corporation (Filter, Search, Sort, Pagination)',
      },
      {
        key: 'corporation_directory.edit_corporation',
        name: 'Edit Corporation',
      },
      {
        key: 'corporation_directory.suspend_reinstate_corporation',
        name: 'Suspend/ Reinstate Corporation',
      },
      {
        key: 'corporation_directory.close_corporation',
        name: 'Close Corporation',
      },
    ],
  },
  {
    name: 'Company Overview',
    sortOrder: 25,
    submodules: [
      { key: 'company_overview.view', name: 'View Company Overview' },
    ],
  },
  {
    name: 'Company Directory',
    sortOrder: 30,
    hidden: true,
    submodules: [
      { key: 'company_directory.add_new_company', name: 'Add New Company' },
      {
        key: 'company_directory.view_company',
        name: 'View Company (Filter, Search, Sort, Pagination)',
      },
      { key: 'company_directory.edit_company', name: 'Edit Company' },
      {
        key: 'company_directory.suspend_reinstate_company',
        name: 'Suspend/ Reinstate Company',
      },
    ],
  },
  {
    name: 'Plan & Pricing',
    sortOrder: 40,
    hidden: true,
    submodules: [{ key: 'plans_pricing.view', name: 'View' }],
  },
  {
    name: 'Billing Management',
    sortOrder: 45,
    submodules: [
      {
        key: 'billing_management.view_billing',
        name: 'View Billing (Filter, Search, Sort, Pagination)',
      },
      { key: 'billing_management.edit_billing', name: 'Edit Billing' },
      {
        key: 'billing_management.cancel_reinstate_subscription',
        name: 'Cancel / Reinstate Subscription',
      },
    ],
  },
  {
    name: 'Invoice Management',
    sortOrder: 50,
    submodules: [
      {
        key: 'invoice_management.view_invoices',
        name: 'View Invoices (Filter, Search, Sort, Pagination)',
      },
      {
        key: 'invoice_management.send_invoice_individual',
        name: 'Send Invoice (Individual)',
      },
      {
        key: 'invoice_management.send_invoice_bulk',
        name: 'Send Invoice (Bulk)',
      },
      { key: 'invoice_management.download_invoice', name: 'Download Invoice' },
      {
        key: 'invoice_management.bulk_download_invoices',
        name: 'Bulk Download Invoice',
      },
    ],
  },
  {
    name: 'Promo Code Management',
    sortOrder: 60,
    hidden: true,
    submodules: [
      {
        key: 'promo_code_management.add_new_promo_code',
        name: 'Add New Promo Code',
      },
      {
        key: 'promo_code_management.view_promo_code_details',
        name: 'View Promo Code details and Usage History (Filter, Search, Sort, Pagination)',
      },
      {
        key: 'promo_code_management.edit_promo_code',
        name: 'Edit Promo Code',
      },
      {
        key: 'promo_code_management.delete_promo_code',
        name: 'Delete Promo Code',
      },
    ],
  },
  {
    name: 'User Directory',
    sortOrder: 70,
    submodules: [
      {
        key: 'user_directory.invite_user_contacts',
        name: 'Invite User | Contacts',
      },
      {
        key: 'user_directory.view_users_contacts',
        name: 'View Users | Contacts (Filter, Search, Sort, Pagination)',
      },
      { key: 'user_directory.bulk_upload', name: 'Bulk Upload' },
      { key: 'user_directory.edit_user', name: 'Edit User' },
      { key: 'user_directory.edit_contact', name: 'Edit Contact' },
      { key: 'user_directory.block_user', name: 'Block User' },
      { key: 'user_directory.remove_user', name: 'Remove User' },
      { key: 'user_directory.remove_contact', name: 'Remove Contact' },
      { key: 'user_directory.resend_invite', name: 'Resend Invite' },
      { key: 'user_directory.cancel_invitation', name: 'Cancel Invitation' },
    ],
  },
  {
    name: 'Roles & Permissions',
    sortOrder: 80,
    hidden: true,
    submodules: [
      { key: 'roles_permissions.view', name: 'View Roles & Permissions' },
      { key: 'roles_permissions.manage', name: 'Manage Roles & Permissions' },
    ],
  },
  {
    name: 'Invite Management',
    sortOrder: 90,
    hidden: true,
    submodules: [
      {
        key: 'invite_management.send_individual_invite',
        name: 'Send Individual Invite',
      },
      {
        key: 'invite_management.view_users',
        name: 'View Users (Filter, Search, Sort, Pagination)',
      },
    ],
  },
  {
    name: 'Assessment',
    sortOrder: 100,
    submodules: [
      { key: 'assessment.list_view', name: 'List View' },
      { key: 'assessment.take_assessment', name: 'Take Assessment' },
      {
        key: 'assessment.view_result',
        name: 'View Result (Share, Download PDF)',
      },
    ],
  },
  {
    name: 'Settings',
    sortOrder: 110,
    submodules: [
      { key: 'settings.profile_overview', name: 'Profile Overview' },
      { key: 'settings.security', name: 'Security' },
      { key: 'settings.privacy_data', name: 'Privacy & data' },
    ],
  },
] as const;

/** Cognito group name → role category name (must match `role_categories.name`). */
export const COGNITO_GROUP_ROLE_CATEGORY_MAP: Readonly<Record<string, string>> =
  {
    SuperAdmin: 'Super Admin',
    CorporationAdmin: 'Corporation Admin',
    CompanyAdmin: 'Company Admin',
    User: 'Employee (Gen. User/ Emp. Associate)',
  };

/** Stable ordering for RBAC contributor groups in API responses. */
export const COGNITO_GROUP_RBAC_ORDER: readonly string[] = [
  'User',
  'CompanyAdmin',
  'CorporationAdmin',
  'SuperAdmin',
] as const;

const RBAC_MAPPED_GROUP_NAMES = new Set(
  Object.keys(COGNITO_GROUP_ROLE_CATEGORY_MAP),
);

/**
 * Cognito groups that contribute to the RBAC union (known pool groups only).
 */
export function resolveRbacContributorGroups(groupNames: string[]): string[] {
  const set = new Set(
    groupNames.filter((name) => RBAC_MAPPED_GROUP_NAMES.has(name)),
  );
  return COGNITO_GROUP_RBAC_ORDER.filter((name) => set.has(name));
}

export const SUBMODULE_KEYS = {
  DASHBOARD: 'dashboard.dashboard',
  CORPORATION_OVERVIEW_VIEW: 'corporation_overview.view',
  CORPORATION_DIRECTORY_ADD: 'corporation_directory.add_new_corporation',
  CORPORATION_DIRECTORY_VIEW: 'corporation_directory.view_corporation',
  CORPORATION_DIRECTORY_EDIT: 'corporation_directory.edit_corporation',
  CORPORATION_DIRECTORY_SUSPEND:
    'corporation_directory.suspend_reinstate_corporation',
  CORPORATION_DIRECTORY_CLOSE: 'corporation_directory.close_corporation',
  COMPANY_OVERVIEW_VIEW: 'company_overview.view',
  COMPANY_DIRECTORY_ADD: 'company_directory.add_new_company',
  COMPANY_DIRECTORY_VIEW: 'company_directory.view_company',
  COMPANY_DIRECTORY_EDIT: 'company_directory.edit_company',
  COMPANY_DIRECTORY_SUSPEND: 'company_directory.suspend_reinstate_company',
  PLANS_PRICING_VIEW: 'plans_pricing.view',
  BILLING_MANAGEMENT_VIEW: 'billing_management.view_billing',
  BILLING_MANAGEMENT_EDIT: 'billing_management.edit_billing',
  BILLING_MANAGEMENT_CANCEL_REINSTATE:
    'billing_management.cancel_reinstate_subscription',
  INVOICE_MANAGEMENT_VIEW: 'invoice_management.view_invoices',
  INVOICE_MANAGEMENT_SEND_INDIVIDUAL:
    'invoice_management.send_invoice_individual',
  INVOICE_MANAGEMENT_SEND_BULK: 'invoice_management.send_invoice_bulk',
  INVOICE_MANAGEMENT_DOWNLOAD: 'invoice_management.download_invoice',
  INVOICE_MANAGEMENT_BULK_DOWNLOAD: 'invoice_management.bulk_download_invoices',
  PROMO_CODE_ADD: 'promo_code_management.add_new_promo_code',
  PROMO_CODE_VIEW: 'promo_code_management.view_promo_code_details',
  PROMO_CODE_EDIT: 'promo_code_management.edit_promo_code',
  PROMO_CODE_DELETE: 'promo_code_management.delete_promo_code',
  USER_DIRECTORY_INVITE: 'user_directory.invite_user_contacts',
  USER_DIRECTORY_VIEW: 'user_directory.view_users_contacts',
  USER_DIRECTORY_BULK_UPLOAD: 'user_directory.bulk_upload',
  USER_DIRECTORY_EDIT: 'user_directory.edit_user',
  USER_DIRECTORY_EDIT_CONTACT: 'user_directory.edit_contact',
  USER_DIRECTORY_BLOCK: 'user_directory.block_user',
  USER_DIRECTORY_REMOVE: 'user_directory.remove_user',
  USER_DIRECTORY_REMOVE_CONTACT: 'user_directory.remove_contact',
  USER_DIRECTORY_RESEND_INVITE: 'user_directory.resend_invite',
  USER_DIRECTORY_CANCEL_INVITATION: 'user_directory.cancel_invitation',
  ROLES_PERMISSIONS_VIEW: 'roles_permissions.view',
  ROLES_PERMISSIONS_MANAGE: 'roles_permissions.manage',
  INVITE_MANAGEMENT_SEND: 'invite_management.send_individual_invite',
  INVITE_MANAGEMENT_VIEW: 'invite_management.view_users',
  ASSESSMENT_LIST: 'assessment.list_view',
  ASSESSMENT_TAKE: 'assessment.take_assessment',
  ASSESSMENT_VIEW_RESULT: 'assessment.view_result',
  SETTINGS_PROFILE: 'settings.profile_overview',
  SETTINGS_SECURITY: 'settings.security',
  SETTINGS_PRIVACY: 'settings.privacy_data',
} as const;

export type SubmoduleKey = (typeof SUBMODULE_KEYS)[keyof typeof SUBMODULE_KEYS];

/** Collects all submodule keys for the given module display names. */
export function collectSubmoduleKeysForModules(
  moduleNames: readonly string[],
): SubmoduleKey[] {
  const nameSet = new Set(moduleNames);
  const keys: SubmoduleKey[] = [];
  for (const mod of RBAC_MODULE_CATALOG) {
    if (!nameSet.has(mod.name)) continue;
    for (const sub of mod.submodules) {
      keys.push(sub.key as SubmoduleKey);
    }
  }
  return keys;
}

/** Submodule keys belonging to modules hidden from non–Super Admin role grids. */
export function submoduleKeysForHiddenModules(): SubmoduleKey[] {
  return collectSubmoduleKeysForModules(HIDDEN_ROLE_GRID_MODULE_NAMES);
}

/** Removes submodule keys that belong to hidden modules. */
export function excludeHiddenModuleSubmoduleKeys(
  keys: readonly SubmoduleKey[],
): SubmoduleKey[] {
  const hidden = new Set(submoduleKeysForHiddenModules());
  return keys.filter((key) => !hidden.has(key));
}

export function isSuperAdminRoleCategoryName(categoryName: string): boolean {
  return categoryName === SUPER_ADMIN_ROLE_CATEGORY_NAME;
}

/** End-user submodules for the General User / Employee Associate category. */
export const END_USER_SUBMODULE_KEYS: SubmoduleKey[] = [
  SUBMODULE_KEYS.DASHBOARD,
  SUBMODULE_KEYS.ASSESSMENT_LIST,
  SUBMODULE_KEYS.ASSESSMENT_TAKE,
  SUBMODULE_KEYS.ASSESSMENT_VIEW_RESULT,
  SUBMODULE_KEYS.SETTINGS_PROFILE,
  SUBMODULE_KEYS.SETTINGS_SECURITY,
  SUBMODULE_KEYS.SETTINGS_PRIVACY,
];

/** Default module access for Corporation Admin role category. */
export const CORPORATION_ADMIN_DEFAULT_MODULE_NAMES = [
  'Dashboard',
  'Corporation Overview',
  'Company Directory',
  'Invoice Management',
  'User Directory',
  'Assessment',
  'Settings',
] as const;

/** Default module access for Company Admin role category. */
export const COMPANY_ADMIN_DEFAULT_MODULE_NAMES = [
  'Dashboard',
  'Company Overview',
  'Billing Management',
  'Invoice Management',
  'User Directory',
  'Assessment',
  'Settings',
] as const;

export const CORPORATION_ADMIN_SUBMODULE_KEYS =
  excludeHiddenModuleSubmoduleKeys(
    collectSubmoduleKeysForModules(CORPORATION_ADMIN_DEFAULT_MODULE_NAMES),
  );

export const COMPANY_ADMIN_SUBMODULE_KEYS = excludeHiddenModuleSubmoduleKeys(
  collectSubmoduleKeysForModules(COMPANY_ADMIN_DEFAULT_MODULE_NAMES),
);

/** Every submodule in the catalog — Super Admin role category defaults. */
export const SUPER_ADMIN_SUBMODULE_KEYS: SubmoduleKey[] =
  RBAC_MODULE_CATALOG.flatMap((mod) =>
    mod.submodules.map((sub) => sub.key as SubmoduleKey),
  );
