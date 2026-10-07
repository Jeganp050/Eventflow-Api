import bcrypt from 'bcryptjs';
import { CONSTANTS } from '../config/constants';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(CONSTANTS.AUTH.BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
