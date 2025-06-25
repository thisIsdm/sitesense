"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

interface User {
    id: string;
    email: string;
    name: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

export function useAuth(): AuthContextType {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const getSession = async () => {
            try {
                const session = await authClient.getSession();
                if (session?.data?.user) {
                    setUser({
                        id: session.data.user.id,
                        email: session.data.user.email,
                        name: session.data.user.name,
                    });
                }
            } catch (error) {
                console.error("Failed to get session:", error);
            } finally {
                setLoading(false);
            }
        };

        getSession();
    }, []);

    const signOut = async () => {
        try {
            await authClient.signOut();
            setUser(null);
            window.location.href = "/signin";
        } catch (error) {
            console.error("Sign out failed:", error);
        }
    };

    return { user, loading, signOut };
}
