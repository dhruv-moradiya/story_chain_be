import { IUser } from '../features/user/user.types';

export class UserPublicMapper {
  static toPublic(user: IUser) {
    return {
      clerkId: user.clerkId.toString(),
      username: user.username,
      email: user.email,
    };
  }

  static toPublicList(users: IUser[]) {
    return users.map((u) => this.toPublic(u));
  }
}
