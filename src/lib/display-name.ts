type AuthLikeUser = {
  email?: string | null;
  user_metadata?: {
    display_name?: string | null;
    full_name?: string | null;
    name?: string | null;
  } | null;
};

function normalizeName(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function emailLocalPart(email?: string | null) {
  const normalizedEmail = normalizeName(email);
  if (!normalizedEmail) return null;

  const [localPart] = normalizedEmail.split("@");
  const cleaned = localPart?.replace(/[._-]+/g, " ").trim();
  return cleaned || null;
}

export function getDisplayName(
  profileName?: string | null,
  authUser?: AuthLikeUser | null,
  fallback = "Участник"
) {
  return (
    normalizeName(profileName) ||
    normalizeName(authUser?.user_metadata?.display_name) ||
    normalizeName(authUser?.user_metadata?.full_name) ||
    normalizeName(authUser?.user_metadata?.name) ||
    emailLocalPart(authUser?.email) ||
    fallback
  );
}
