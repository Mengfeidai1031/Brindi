import { User } from '@prisma/client';

/** Representación pública del usuario: NUNCA expone password_hash ni google_id. */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  locale: string;
  paymentLink: string | null;
  createdAt: Date;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    locale: user.locale,
    paymentLink: user.paymentLink,
    createdAt: user.createdAt,
  };
}
