const env = import.meta.env

const read = (value) => (typeof value === 'string' ? value.trim() : '')

export const API_BASE_URL = read(env.VITE_API_BASE_URL)

export const isBackendConfigured = API_BASE_URL.length > 0

export const cognitoConfig = {
  region: read(env.VITE_AWS_REGION),
  userPoolId: read(env.VITE_COGNITO_USER_POOL_ID),
  clientId: read(env.VITE_COGNITO_CLIENT_ID),
  hostedUiDomain: read(env.VITE_COGNITO_DOMAIN),
}

export const isAuthConfigured = Boolean(
  cognitoConfig.region && cognitoConfig.userPoolId && cognitoConfig.clientId,
)

export const BACKEND_NOT_CONNECTED_MESSAGE =
  'Backend not connected. Data will appear when the service is configured.'
