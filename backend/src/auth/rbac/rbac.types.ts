export type SubmoduleAccessEntry = {
  key: string;
  enabled: boolean;
};

export type AuthorizationContext = {
  /** True when caller is in the SuperAdmin Cognito group (full access). */
  isSuperAdmin: boolean;
  /** Cognito groups that contribute to RBAC (mapped to a role category). */
  effectiveGroups: string[];
  /** Role categories unioned from {@link effectiveGroups}. */
  roleCategoryIds: string[];
  /** Assigned app role id (display/tenancy; not used for submodule RBAC). */
  roleId: string | null;
  /** Enabled submodule keys for this principal (union across categories). */
  enabledSubmoduleKeys: ReadonlySet<string>;
  /** Flat submodule access list for profile/UI (key + enabled only). */
  submodules: SubmoduleAccessEntry[];
};
