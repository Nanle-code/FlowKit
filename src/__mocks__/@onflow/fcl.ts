const fcl = {
  config: jest.fn().mockReturnValue({
    put: jest.fn(),
  }),
  authenticate: jest.fn().mockResolvedValue(undefined),
  unauthenticate: jest.fn().mockResolvedValue(undefined),
  currentUser: {
    subscribe: jest.fn((cb: (user: { loggedIn: boolean; addr: string }) => void) => {
      cb({ loggedIn: true, addr: '0x1d007d755531709b' })
      return jest.fn() // unsub
    }),
  },
  mutate: jest.fn().mockResolvedValue('0xmocktxhashdeadbeef'),
  query: jest.fn().mockResolvedValue('10.00000000'),
  authz: jest.fn(),
}

export default fcl
export const { config, authenticate, unauthenticate, currentUser, mutate, query, authz } = fcl
