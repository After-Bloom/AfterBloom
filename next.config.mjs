/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // development only: keep pages compiled for 10 minutes instead of dropping them after a minute, so moving between screens does not wait for a recompile
  onDemandEntries: { maxInactiveAge: 10 * 60 * 1000, pagesBufferLength: 12 },
};
