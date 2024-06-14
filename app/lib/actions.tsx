'use server'

import {z} from 'zod'
import {sql} from "@vercel/postgres";
import {revalidatePath} from "next/cache";
import {redirect, RedirectType} from "next/navigation";
import {signIn} from "@/auth";
import {AuthError} from "next-auth";

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending','paid']),
    date: z.string()
})

const CreateInvoice = FormSchema.omit({id: true, date: true})

export async function createInvoice(fromData: FormData) {
    const rawFormData = {
        customerId: fromData.get('customerId'),
        amount: fromData.get('amount'),
        status: fromData.get('status'),
    }
    console.log(rawFormData);

    const {customerId, amount,status} = CreateInvoice.parse(rawFormData)
    const amountInCents = (amount * 100).toFixed(0)
    const date = new Date().toISOString().split('T')[0]

    try {
        await sql`
            INSERT INTO invoices (customer_id, amount, status, date) 
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `
    } catch (error) {
        return {
            message: `Error creating invoice ${error}`,
        }
    }

    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices',RedirectType.replace)
}

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
    console.log(id,formData);

    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    const amountInCents = (amount * 100).toFixed(0);

    try {
        await sql`
            UPDATE invoices
            SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
            WHERE id = ${id}
        `
    } catch (error) {
        return {
            message: `Error updating invoice ${error}`,
        }
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`
    } catch (error) {
        console.log(`Error deleting invoice ${id}`);
        return {
            message: `Error deleting invoice ${error}`,
        }
    }

    revalidatePath('/dashboard/invoices');
    return {message: `Deleted invoice ${id}`};
}

export async function authenticate(prevState: string | undefined, formData: FormData) {
    formData.forEach((value, key) => {
        console.log(key,value);
    })
    let provider: 'credentials' | 'google' = 'credentials'
    if (formData.get('provider') == 'google') {
        provider = 'google'
    }

    try {
        await signIn(provider,formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return 'Invalid credentials.'
                default:
                    return 'Something went wrong.'
            }
        }
        throw error
    }
}