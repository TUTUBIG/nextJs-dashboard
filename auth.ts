import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from "next-auth/providers/credentials";
import {z} from 'zod';
import {User} from "@/app/lib/definitions";
import {sql} from "@vercel/postgres";
import bcrypt from "bcrypt";
import Google from "@auth/core/providers/google";

async function getUser(email: string): Promise<User | undefined> {
    try {
        const user = await sql<User>`SELECT * FROM users WHERE email=${email}`
        return user.rows[0]
    } catch (error) {
        throw new Error(`Failed to fetch user ${email}`)
    }
}

export const { handlers, signIn, signOut,auth } = NextAuth({
    ...authConfig,
    providers: [Credentials({
        async authorize(credentials) {
            const parsedCredentials = z.object({
                email: z.string().email(),
                password: z.string().min(6)
            }).safeParse(credentials)

            if (parsedCredentials.success) {
                const { email, password } = parsedCredentials.data;
                const user = await getUser(email);
                if (!user) return null;

                const passwordsMatch = await bcrypt.compare(password, user.password);
                if (passwordsMatch) return user;
            }

            console.log('Invalid credentials');
            return null
        }
    }),Google]
});