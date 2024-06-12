import type { NextAuthConfig } from 'next-auth';
import Credentials from "@auth/core/providers/credentials";
import {z} from 'zod';
import {User} from "@/app/lib/definitions";
import {sql} from "@vercel/postgres";
import bcrypt from 'bcrypt';

async function getUser(email: string): Promise<User | undefined> {
    try {
        const user = await sql<User>`SELECT * FROM users WHERE email=${email}`
        return user.rows[0]
    } catch (error) {
        throw new Error(`Failed to fetch user ${email}`)
    }
}

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
            if (isOnDashboard) {
                return isLoggedIn;
                 // Redirect unauthenticated users to login page
            } else if (isLoggedIn) {
                return Response.redirect(new URL('/dashboard', nextUrl));
            }
            return true;
        },
    },
    providers: [Credentials({
        async authorize(credentials) {
            const parsedCredentials = z.object({
                email: z.string().email(),
                password: z.string().min(6)
            }).safeParse(credentials)
            if (parsedCredentials.success) {
                const {email,password} = parsedCredentials.data
                const user = await getUser(email)
                if (!user) return null
                const passwordsMatch = await bcrypt.compare(password,user.password)
                if (passwordsMatch) return user
            }
            return null
        }
    })], // Add providers with an empty array for now
} satisfies NextAuthConfig;