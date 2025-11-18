import { mockRequest, timestamp } from './client'
import type {
  MeResponse,
  ProviderConnection,
  ProviderKey,
  ProviderStatus,
  ProviderSyncMap,
} from '../types/api'

const providerSyncTimes: ProviderSyncMap = {
  google: timestamp(),
  microsoft: timestamp(),
  canvas: null,
}

let providers: ProviderStatus = {
  google: true,
  microsoft: true,
  canvas: false,
}

let currentUser: MeResponse['user'] = {
  id: 'user_123',
  name: 'Tanishq Thakkar',
  email: 'tanishq@ucmail.uc.edu',
}

export async function fetchMe(): Promise<MeResponse> {
  return mockRequest(() => ({
    user: currentUser,
    providers,
  }))
}

export async function signInWith(provider: ProviderKey) {
  return mockRequest(() => {
    currentUser = {
      id: `user_${provider}`,
      name: 'UC Student',
      email: `student+${provider}@uc.edu`,
    }
    providers = { ...providers, [provider]: true }
    providerSyncTimes[provider] = timestamp()
    return { success: true }
  })
}

export async function connectProvider(provider: ProviderKey) {
  return mockRequest(() => {
    providers = { ...providers, [provider]: true }
    providerSyncTimes[provider] = timestamp()
    return { success: true }
  })
}

export async function disconnectProvider(provider: ProviderKey) {
  return mockRequest(() => {
    providers = { ...providers, [provider]: false }
    providerSyncTimes[provider] = null
    return { success: true }
  })
}

export async function fetchConnections(): Promise<ProviderConnection[]> {
  return mockRequest(() =>
    (Object.keys(providers) as ProviderKey[]).map((key) => ({
      provider: key,
      connected: providers[key],
      lastSync: providerSyncTimes[key],
    })),
  )
}

