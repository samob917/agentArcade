import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});
