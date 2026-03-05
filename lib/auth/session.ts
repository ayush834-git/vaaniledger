import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/config";

export const getServerAuthSession = () => getServerSession(authOptions);