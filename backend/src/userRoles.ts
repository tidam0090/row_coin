export type UserRole = 'user' | 'admin';

function configuredAdminEmails(): Set<string> {
  const emails = [process.env.ADMIN_EMAILS, process.env.ADMIN_EMAIL]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);

  return new Set(emails);
}

export function hasConfiguredAdminEmails(): boolean {
  return configuredAdminEmails().size > 0;
}

export function resolveUserRoleByEmail(email: string): UserRole {
  return configuredAdminEmails().has(email.trim().toLowerCase()) ? 'admin' : 'user';
}
