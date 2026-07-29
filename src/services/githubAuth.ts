import { authorize, AuthConfiguration, AuthorizeResult } from 'react-native-app-auth';

// TODO: Replace these with your actual GitHub OAuth App credentials
const GITHUB_CLIENT_ID = 'Ov23liCbIOD1n93J0hja';
const GITHUB_CLIENT_SECRET = '33f4e4b0b285601f65a0eb70ac8bc0e6cae7aaa0';

const config: AuthConfiguration = {
  issuer: 'https://github.com',
  clientId: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  redirectUrl: 'phcode://oauth',
  scopes: ['repo', 'user'],
  serviceConfiguration: {
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    revocationEndpoint: `https://github.com/settings/connections/applications/${GITHUB_CLIENT_ID}`
  }
};

export const loginWithGithub = async (): Promise<AuthorizeResult> => {
  try {
    const result = await authorize(config);
    return result;
  } catch (error) {
    console.error('Failed to authenticate with GitHub', error);
    throw error;
  }
};

export const fetchGithubUser = async (accessToken: string) => {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'phcode-app',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching GitHub user', error);
    throw error;
  }
};
export const createGithubRepo = async (accessToken: string, name: string, isPrivate: boolean) => {
  try {
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'phcode-app',
      },
      body: JSON.stringify({
        name,
        private: isPrivate,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create repository');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating GitHub repo', error);
    throw error;
  }
};
