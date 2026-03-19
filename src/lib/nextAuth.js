import GoogleProvider from 'next-auth/providers/google';

import { findOrCreateSocialUser } from './auth';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google') {
        return false;
      }

      const appUser = await findOrCreateSocialUser({
        provider: 'google',
        providerSubject: account.providerAccountId || profile?.sub,
        email: user.email,
        fullName: user.name,
        profileImage: user.image,
      });

      user.id = String(appUser.id);
      user.username = appUser.username;
      user.authProvider = 'google';
      user.image = appUser.profile_image || user.image;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.appUserId = user.id;
        token.username = user.username;
        token.authProvider = user.authProvider || 'google';
        token.picture = user.image || token.picture;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.appUserId;
        session.user.username = token.username;
        session.user.authProvider = token.authProvider || 'google';
        session.user.image = token.picture || null;
      }

      return session;
    },
  },
};
