import { Role } from '../../common/enums/role.enum';

export type RequestUser = {
  sub: string;
  email: string;
  roles: Role[];
};