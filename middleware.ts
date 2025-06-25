import { NextRequest, NextResponse } from "next/server";
import { auth } from "./lib/auth";

export async function middleware(request: NextRequest) {
    const routeRegex = /^\/($|configure(?:\/.*)?$|api\/(?!auth(?:\/|$))[^/]+(?:\/.*)?$|results(?:\/.*)?$)/;
    if (routeRegex.test(request.nextUrl.pathname)) {
        const user = auth.api.getSession({
            headers: request.headers,
        })
        console.log(user)
        return NextResponse.next();
    } else {
        return NextResponse.next();
    };
}