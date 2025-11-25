/**
 * LinkedIn API Helper
 * 
 * This module provides utilities for interacting with LinkedIn's API.
 * It handles OAuth token management and fetching connection data.
 * 
 * Note: This requires LinkedIn API credentials to be set in environment variables:
 * - LINKEDIN_CLIENT_ID
 * - LINKEDIN_CLIENT_SECRET
 * - LINKEDIN_REDIRECT_URI
 */

export interface LinkedInProfile {
  id: string;
  firstName?: {
    localized?: Record<string, string>;
    preferredLocale?: {
      country?: string;
      language?: string;
    };
  };
  lastName?: {
    localized?: Record<string, string>;
    preferredLocale?: {
      country?: string;
      language?: string;
    };
  };
  headline?: string;
  location?: {
    country?: string;
    geographicArea?: string;
    city?: string;
    postalCode?: string;
  };
  industry?: string;
  positions?: {
    values?: Array<{
      title?: string;
      companyName?: string;
      startDate?: {
        year?: number;
        month?: number;
      };
      endDate?: {
        year?: number;
        month?: number;
      };
      description?: string;
      location?: {
        country?: string;
      };
    }>;
  };
  educations?: {
    values?: Array<{
      schoolName?: string;
      degree?: string;
      fieldOfStudy?: string;
      startDate?: {
        year?: number;
      };
      endDate?: {
        year?: number;
      };
    }>;
  };
  summary?: string;
  skills?: {
    values?: Array<{
      name?: string;
    }>;
  };
  profilePicture?: {
    displayImage?: string;
  };
  publicProfileUrl?: string;
}

export interface LinkedInConnection {
  id: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  location?: string;
  industry?: string;
  currentPosition?: string;
  currentCompany?: string;
  profileUrl?: string;
  profilePictureUrl?: string;
  summary?: string;
  skills?: string[];
  education?: Array<{
    school?: string;
    degree?: string;
    fieldOfStudy?: string;
    startYear?: number;
    endYear?: number;
  }>;
  experience?: Array<{
    title?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
}

/**
 * Generates the LinkedIn OAuth authorization URL.
 */
export function getLinkedInAuthUrl(state?: string): string {
  const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
  const redirectUri = Deno.env.get("LINKEDIN_REDIRECT_URI") ||
    "http://localhost:8000/auth/linkedin/callback";

  if (!clientId) {
    throw new Error("LINKEDIN_CLIENT_ID environment variable is not set");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "r_liteprofile r_emailaddress r_network",
    ...(state && { state }),
  });

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

/**
 * Exchanges an authorization code for an access token.
 */
export async function exchangeCodeForToken(
  code: string,
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
  const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");
  const redirectUri = Deno.env.get("LINKEDIN_REDIRECT_URI") ||
    "http://localhost:8000/auth/linkedin/callback";

  if (!clientId || !clientSecret) {
    throw new Error(
      "LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables must be set",
    );
  }

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to exchange code for token: ${response.status} ${errorText}`,
    );
  }

  return await response.json();
}

/**
 * Fetches the current user's LinkedIn profile.
 */
export async function getCurrentUserProfile(
  accessToken: string,
): Promise<LinkedInProfile> {
  const response = await fetch(
    "https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,headline,location,industry,summary,profilePicture(displayImage~:playableStreams),publicProfileUrl)",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch profile: ${response.status} ${errorText}`,
    );
  }

  return await response.json();
}

/**
 * Fetches the current user's email address.
 */
export async function getCurrentUserEmail(
  accessToken: string,
): Promise<string | undefined> {
  try {
    const response = await fetch(
      "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      return undefined;
    }

    const data = await response.json();
    return data.elements?.[0]?.["handle~"]?.emailAddress;
  } catch {
    return undefined;
  }
}

/**
 * Fetches detailed profile information for a user.
 */
export async function getProfileDetails(
  accessToken: string,
  personId: string,
): Promise<LinkedInProfile | null> {
  try {
    // Note: LinkedIn API v2 has restrictions on what profile data can be accessed
    // This is a simplified version that may need adjustment based on actual API permissions
    const response = await fetch(
      `https://api.linkedin.com/v2/people/(id:${personId})?projection=(id,firstName,lastName,headline,location,industry,summary,positions,educations,skills,profilePicture(displayImage~:playableStreams),publicProfileUrl)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Fetches the current user's connections.
 * 
 * Note: LinkedIn's API has restrictions on accessing connections.
 * The Connections API is only available to approved partners.
 * This function provides a structure for when such access is available.
 */
export function getConnections(
  _accessToken: string,
): Promise<LinkedInConnection[]> {
  // Note: The actual LinkedIn Connections API requires special approval
  // This is a placeholder that would need to be implemented based on:
  // 1. Approved LinkedIn Partner status
  // 2. Specific API endpoints available to your application
  // 3. Rate limiting and pagination handling

  // For now, this returns an empty array as a placeholder
  // In a real implementation, you would:
  // 1. Call the appropriate LinkedIn API endpoint
  // 2. Handle pagination
  // 3. Transform the response into LinkedInConnection format
  // 4. Handle rate limiting and errors

  console.warn(
    "LinkedIn Connections API requires special approval. This is a placeholder implementation.",
  );
  
  return Promise.resolve([]);
}

/**
 * Transforms a LinkedIn profile into the connection format used by the concept.
 */
export function transformProfileToConnection(
  profile: LinkedInProfile,
): Omit<LinkedInConnection, "id"> {
  const firstName = profile.firstName?.localized?.[
    Object.keys(profile.firstName.localized)[0]
  ] || "";
  const lastName = profile.lastName?.localized?.[
    Object.keys(profile.lastName?.localized || {})[0]
  ] || "";

  const location = profile.location
    ? [
      profile.location.city,
      profile.location.geographicArea,
      profile.location.country,
    ].filter(Boolean).join(", ")
    : undefined;

  const currentPosition = profile.positions?.values?.[0]?.title;
  const currentCompany = profile.positions?.values?.[0]?.companyName;

  const skills = profile.skills?.values?.map((s) => s.name || "").filter(
    Boolean,
  ) || [];

  const education = profile.educations?.values?.map((edu) => ({
    school: edu.schoolName,
    degree: edu.degree,
    fieldOfStudy: edu.fieldOfStudy,
    startYear: edu.startDate?.year,
    endYear: edu.endDate?.year,
  })) || [];

  const experience = profile.positions?.values?.map((pos) => ({
    title: pos.title,
    company: pos.companyName,
    startDate: pos.startDate
      ? `${pos.startDate.year}-${String(pos.startDate.month || 1).padStart(2, "0")}`
      : undefined,
    endDate: pos.endDate
      ? `${pos.endDate.year}-${String(pos.endDate.month || 1).padStart(2, "0")}`
      : undefined,
    description: pos.description,
  })) || [];

  const profilePictureUrl = profile.profilePicture?.displayImage;

  return {
    firstName,
    lastName,
    headline: profile.headline,
    location,
    industry: profile.industry,
    currentPosition,
    currentCompany,
    profileUrl: profile.publicProfileUrl,
    profilePictureUrl,
    summary: profile.summary,
    skills,
    education,
    experience,
  };
}

