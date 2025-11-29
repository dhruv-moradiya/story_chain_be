import { PlatformRole } from '../types';

export class UserRules {
  static determineInitialRole(totalUsers: number) {
    return totalUsers === 1 ? PlatformRole.SUPER_ADMIN : PlatformRole.USER;
  }
}
