import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return ['/signin-with-chatgpt', '/signout-with-chatgpt', '/callback'].map(source => ({
      source,
      destination: `https://veridanth-research-ghana.elkings.chatgpt.site${source}`,
      permanent: false,
    }));
  },
};

export default nextConfig;
