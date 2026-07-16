/**
 * Public user shape — never leak password or refresh token.
 */
function toPublicUser(user) {
  if (!user) return null;

  const doc = user.toObject ? user.toObject() : user;

  return {
    id: doc._id?.toString() || doc.id,
    name: doc.name,
    email: doc.email,
    avatar: doc.avatar,
    role: doc.role,
    provider: doc.provider,
    isVerified: doc.isVerified,
    streak: doc.streak,
    currentGoal: doc.currentGoal,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

module.exports = { toPublicUser };
