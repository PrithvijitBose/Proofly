import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthenticatedSessionOrPat } from "@/lib/auth/github-token";
import { PublicProfileView } from "@/components/profile/public-profile-view";
import { resolvePublicProfile } from "@/lib/github/public-profile-service";
import { headers } from "next/headers";
import { DEFAULT_PRODUCTION_APP_URL } from "@/config/env";

export const dynamic = "force-dynamic";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username} | Proofly Verified Developer Identity`,
    description: `Explore ${username}'s verified engineering accomplishments, cornerstone projects, and career story on Proofly.`,
    openGraph: {
      title: `@${username} | Proofly Developer Passport`,
      description: `Verified GitHub accomplishments, cornerstone repositories, and career journey for @${username}.`,
    },
  };
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username).trim();

  // Determine if viewing user is the authenticated owner
  const authData = await getAuthenticatedSessionOrPat();
  const isOwner =
    authData.status === "authenticated" &&
    authData.login.toLowerCase() === decodedUsername.toLowerCase();

  // Determine request host
  let hostOrigin = DEFAULT_PRODUCTION_APP_URL;
  try {
    const headerStore = await headers();
    const host = headerStore.get("host");
    const proto = headerStore.get("x-forwarded-proto") || "http";
    if (host) {
      hostOrigin = `${proto}://${host}`;
    }
  } catch {
    // Default fallback
  }

  // Resolve profile directly on the server (zero loopback network failures)
  const profile = await resolvePublicProfile(decodedUsername, hostOrigin);

  if (!profile) {
    notFound();
  }

  return <PublicProfileView profile={profile} isOwner={isOwner} />;
}
