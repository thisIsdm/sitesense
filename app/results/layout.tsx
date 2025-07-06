import ProtectedRoute from "@/components/protectedRoute";

export default function Layout({ children }: { children: React.ReactNode }) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
}
