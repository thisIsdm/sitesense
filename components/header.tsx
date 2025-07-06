import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User, Menu, ArrowDown, ChevronDown } from "lucide-react";
import { useAuth } from "./useAuth";
import { useEffect, useState } from "react";

export function Header({ auth: authPage }: { auth?: boolean }) {
    const { loading, user, signOut } = useAuth();
    const [popupOpen, setPopupOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest(".authPopup")) {
                setPopupOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };

    }, []);

    return (
        <header
            className={`${
                authPage
                    ? "bg-[F8FAFC] border rounded-[0.5rem]"
                    : "bg-white border-b"
            }`}
        >
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
                    <div className="flex items-center space-x-2">
                        {!authPage && (
                            <div className="relative authPopup">
                                <button
                                    className="flex gap-2 items-center"
                                    onClick={(e) => {
                                        setPopupOpen(!popupOpen);
                                    }}
                                >
                                    {!loading && user?.name}
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                </button>
                                {popupOpen && (
                                    <div className="absolute right-0 mt-2 min-w-[5rem] bg-white border rounded-lg shadow-lg z-10 p-1">
                                        <ul>
                                            <li>
                                                <Button
                                                    variant="ghost"
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                    onClick={signOut}
                                                >
                                                    Sign Out
                                                </Button>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
