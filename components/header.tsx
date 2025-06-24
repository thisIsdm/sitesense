import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User, Menu } from "lucide-react";

export function Header({ auth: authPage }: { auth?: boolean }) {
    return (
        <header className={`${authPage ? "bg-[F8FAFC] border rounded-[0.5rem]" : "bg-white border-b"}`}>
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Link href="/" className="cursor-pointer">
                            <Image
                                src="/logo.png"
                                alt="SiteSenseAI"
                                width={150}
                                height={30}
                            />
                        </Link>
                    </div>

                    {!authPage && <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                            <User className="w-4 h-4 mr-2" />
                            Log in
                        </Button>
                        <Button
                            size="sm"
                            className="bg-[#AE4B4B] hover:bg-[#AE4B4B]/90"
                        >
                            Sign up
                        </Button>
                        <Button variant="ghost" size="sm" className="md:hidden">
                            <Menu className="w-4 h-4" />
                        </Button>
                    </div>}
                </div>
            </div>
        </header>
    );
}
