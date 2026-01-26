import { TOAuthProvider } from './user.types';

enum AuthProvider {
  EMAIL = 'email',
  GOOGLE = 'google',
  GITHUB = 'github',
  DISCORD = 'discord',
}

const AUTH_PROVIDER = ['email', 'google', 'github', 'discord'] as const;

const CONNECTED_ACCOUNTS: TOAuthProvider[] = [
  AuthProvider.GOOGLE,
  AuthProvider.GITHUB,
  AuthProvider.DISCORD,
] as const;

enum Badge {
  STORY_STARTER = 'STORY_STARTER',
  BRANCH_CREATOR = 'BRANCH_CREATOR',
  TOP_CONTRIBUTOR = 'TOP_CONTRIBUTOR',
  MOST_UPVOTED = 'MOST_UPVOTED',
  TRENDING_AUTHOR = 'TRENDING_AUTHOR',
  VETERAN_WRITER = 'VETERAN_WRITER',
  COMMUNITY_FAVORITE = 'COMMUNITY_FAVORITE',
  COLLABORATIVE = 'COLLABORATIVE',
  QUALITY_CURATOR = 'QUALITY_CURATOR',
}

const ALL_BADGES: Badge[] = [
  Badge.STORY_STARTER,
  Badge.BRANCH_CREATOR,
  Badge.TOP_CONTRIBUTOR,
  Badge.MOST_UPVOTED,
  Badge.TRENDING_AUTHOR,
  Badge.VETERAN_WRITER,
  Badge.COMMUNITY_FAVORITE,
  Badge.COLLABORATIVE,
  Badge.QUALITY_CURATOR,
] as const;

export { AuthProvider, Badge, AUTH_PROVIDER, CONNECTED_ACCOUNTS, ALL_BADGES };
