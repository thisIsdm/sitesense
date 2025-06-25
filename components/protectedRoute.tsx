"use client";

import { useAuth } from "@/components/useAuth";
import { useEffect } from "react";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && !user) {
            window.location.href = "/signin";
        }
    }, [user, loading]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return <>{children}</>;
}
